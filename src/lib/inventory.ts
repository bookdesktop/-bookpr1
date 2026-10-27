// รายการเบิกของ (PartTran) และ Stock คงเหลือ (PartWhse)

import {
  fetchAll,
  getIssueDocs,
  getPartTrans,
  getParts,
  getPartWarehouses,
  getUsers,
  getWarehouses,
  odataString,
  type BaqRow,
} from "@/lib/epicor";
import { monthRange } from "@/lib/month";

export const PAGE_SIZE = 50;

// STK-UKN = Issue Miscellaneous Material (เบิกใช้ทั่วไป ไม่ผูก Job, มีเลขที่ใบเบิกใน TranReference)
// STK-MTL = Issue Material เข้า Job (รวม Backflush อัตโนมัติจากการผลิต — ปริมาณมาก ดึงช้ากว่า)
export const ISSUE_TYPES = {
  "STK-UKN": "เบิกใช้ทั่วไป",
  "STK-MTL": "เบิกเข้า Job ผลิต",
} as const;
export type IssueType = keyof typeof ISSUE_TYPES;
export const isIssueType = (v: unknown): v is IssueType => typeof v === "string" && v in ISSUE_TYPES;

export type Paged<T> = { rows: T[]; hasNext: boolean };

// ดึงเกินมา 1 แถวเพื่อรู้ว่ามีหน้าถัดไปไหม (BO service ไม่มี count ที่เชื่อถือได้)
function paged<T>(rows: T[]): Paged<T> {
  return { rows: rows.slice(0, PAGE_SIZE), hasNext: rows.length > PAGE_SIZE };
}

export async function getWarehouseOptions(): Promise<{ code: string; name: string }[]> {
  const { rows } = await getWarehouses();
  return rows
    .map((w) => ({ code: String(w.WarehouseCode), name: String(w.Description ?? "") }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

type IssueFilter = { month: string; type: IssueType; q?: string; warehouse?: string };

function issueFilter(opts: IssueFilter, withSearch = true) {
  const { start, end } = monthRange(opts.month);
  const parts = [`TranDate ge ${start}`, `TranDate lt ${end}`, `TranType eq ${odataString(opts.type)}`];
  if (opts.warehouse) parts.push(`WareHouseCode eq ${odataString(opts.warehouse)}`);
  if (withSearch && opts.q) {
    const q = odataString(opts.q);
    parts.push(`(contains(PartNum,${q}) or contains(TranReference,${q}) or contains(EntryPerson,${q}))`);
  }
  return parts.join(" and ");
}

// UserID → ชื่อ (เทียบแบบไม่สนตัวพิมพ์ เพราะ EntryPerson บันทึกตัวพิมพ์ไม่ตรงกับ UserFile เสมอไป)
async function getUserNames() {
  const users = await fetchAll(getUsers, { select: "UserID,Name" });
  const names = new Map(users.map((u) => [String(u.UserID).toLowerCase(), String(u.Name ?? "")]));
  return (id: unknown) => names.get(String(id ?? "").toLowerCase()) ?? "";
}

type IssueDoc = { empId: string; empName: string; dept: string; purpose: string };

// ผู้ขอเบิกตัวจริงอยู่ในใบขอเบิก UD100 (PartTran.EntryPerson เป็นเจ้าหน้าที่ Store ที่บันทึกตัดสต็อก)
async function getIssueDocMap(refs: string[]) {
  const unique = [...new Set(refs.filter(Boolean))];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 40) chunks.push(unique.slice(i, i + 40));
  const results = await Promise.all(
    chunks.map((chunk) =>
      getIssueDocs({
        filter: `Key2 eq 'GI' and (${chunk.map((k) => `Key1 eq ${odataString(k)}`).join(" or ")})`,
        select: "Key1,ShortChar01,Character02,ShortChar04,Character03",
        top: chunk.length,
      }),
    ),
  );
  const docs = new Map<string, IssueDoc>();
  for (const r of results.flatMap((x) => x.rows)) {
    docs.set(String(r.Key1), {
      empId: String(r.ShortChar01 ?? "").trim(),
      empName: String(r.Character02 ?? "").trim(),
      dept: String(r.ShortChar04 ?? "").trim(),
      purpose: String(r.Character03 ?? "").trim(),
    });
  }
  return docs;
}


// เบิกทั่วไปมีไม่กี่ร้อยรายการต่อเดือน: ดึงทั้งเดือนแล้วค้น/แบ่งหน้าในหน่วยความจำ
// เพื่อให้ค้นจากชื่อผู้ขอเบิก/แผนก (อยู่ใน UD100 ไม่ใช่ PartTran) ได้
async function getMiscIssuesOfMonth(opts: IssueFilter): Promise<BaqRow[]> {
  const [rows, nameOf] = await Promise.all([
    fetchAll(getPartTrans, { filter: issueFilter(opts, false), orderby: "TranDate desc,TranNum desc" }, 2000),
    getUserNames(),
  ]);
  const docs = await getIssueDocMap(rows.map((r) => String(r.TranReference ?? "")));
  const all = rows.map((r): BaqRow => {
    const doc = docs.get(String(r.TranReference ?? ""));
    return {
      ...r,
      EntryPersonName: nameOf(r.EntryPerson),
      RequesterID: doc?.empId ?? "",
      RequesterName: doc?.empName ?? "",
      RequesterDept: doc?.dept ?? "",
      RequesterPurpose: doc?.purpose ?? "",
    };
  });

  const needle = opts.q?.toLowerCase();
  if (!needle) return all;
  return all.filter((r) =>
    [r.PartNum, r.PartNumPartDescription, r.TranReference, r.EntryPerson, r.RequesterID, r.RequesterName, r.RequesterDept]
      .some((v) => String(v ?? "").toLowerCase().includes(needle)),
  );
}

export async function getIssues(opts: IssueFilter & { page: number }): Promise<Paged<BaqRow>> {
  if (opts.type === "STK-UKN") {
    const all = await getMiscIssuesOfMonth(opts);
    const startIdx = (opts.page - 1) * PAGE_SIZE;
    return { rows: all.slice(startIdx, startIdx + PAGE_SIZE), hasNext: all.length > startIdx + PAGE_SIZE };
  }

  // เบิกเข้า Job: ไม่มีใบขอเบิก UD100 และมีหลักแสนรายการ — แบ่งหน้าที่ Epicor
  const [{ rows }, nameOf] = await Promise.all([
    getPartTrans({
      filter: issueFilter(opts),
      orderby: "TranDate desc,TranNum desc",
      top: PAGE_SIZE + 1,
      skip: (opts.page - 1) * PAGE_SIZE,
    }),
    getUserNames(),
  ]);
  return paged(rows.map((r) => ({ ...r, EntryPersonName: nameOf(r.EntryPerson) })));
}

export type Requester = {
  empId: string;
  name: string;
  dept: string;
  docCount: number;
  tranCount: number;
  value: number;
};

// สรุปผู้ขอเบิกทั้งเดือน (เฉพาะเบิกทั่วไป) จากใบขอเบิก UD100 ที่ Store ตัดจ่ายแล้วใน PartTran
export async function getRequesters(opts: IssueFilter): Promise<Requester[]> {
  const rows = await getMiscIssuesOfMonth({ ...opts, q: undefined });
  const byEmp = new Map<string, Requester & { docs: Set<string> }>();
  for (const r of rows) {
    const empId = String(r.RequesterID);
    const key = empId || String(r.RequesterName);
    let s = byEmp.get(key);
    if (!s) {
      s = { empId, name: String(r.RequesterName) || "(ไม่พบใบขอเบิก)", dept: String(r.RequesterDept), docCount: 0, tranCount: 0, value: 0, docs: new Set() };
      byEmp.set(key, s);
    }
    s.tranCount++;
    if (r.TranReference) s.docs.add(String(r.TranReference));
    s.value += Number(r.ExtCost) || 0;
  }
  return [...byEmp.values()]
    .map(({ docs, ...s }) => ({ ...s, docCount: docs.size }))
    .sort((a, b) => b.value - a.value);
}

export type StockRow = {
  PartNum: string;
  PartDescription: string;
  Warehouse: string;
  OnHandQty: number;
  MinimumQty: number;
  UM: string;
  Status: string;
};

function stockStatus(onHand: number, min: number) {
  if (onHand <= 0) return "หมด";
  if (min > 0 && onHand < min) return "ต่ำกว่าขั้นต่ำ";
  return "มีของ";
}

// ดึงชื่อ/หน่วยของ Part ทีละไม่เกิน 50 รหัส (ต่อเป็น or ใน $filter)
async function getPartInfo(partNums: string[]) {
  const info = new Map<string, { desc: string; um: string }>();
  for (let i = 0; i < partNums.length; i += 50) {
    const chunk = partNums.slice(i, i + 50);
    const { rows } = await getParts({
      filter: chunk.map((p) => `PartNum eq ${odataString(p)}`).join(" or "),
      select: "PartNum,PartDescription,IUM",
      top: chunk.length,
    });
    for (const r of rows) info.set(String(r.PartNum), { desc: String(r.PartDescription ?? ""), um: String(r.IUM ?? "") });
  }
  return info;
}

export async function getStock(opts: {
  q?: string;
  warehouse?: string;
  inStockOnly: boolean;
  page: number;
}): Promise<Paged<StockRow>> {
  const whseFilters: string[] = [];
  if (opts.warehouse) whseFilters.push(`WarehouseCode eq ${odataString(opts.warehouse)}`);
  if (opts.inStockOnly) whseFilters.push("OnHandQty gt 0");

  let whseRows: BaqRow[];
  let hasNext: boolean;

  if (opts.q) {
    // ค้นจากรหัสหรือชื่อสินค้าที่ Part ก่อน แล้วค่อยดึงยอดของ Part เหล่านั้น
    const q = odataString(opts.q);
    const { rows: parts } = await getParts({
      filter: `contains(PartNum,${q}) or contains(PartDescription,${q})`,
      select: "PartNum",
      orderby: "PartNum",
      top: 200,
    });
    const nums = parts.map((p) => String(p.PartNum));
    const all: BaqRow[] = [];
    for (let i = 0; i < nums.length; i += 50) {
      const chunk = nums.slice(i, i + 50);
      const { rows } = await getPartWarehouses({
        filter: [`(${chunk.map((p) => `PartNum eq ${odataString(p)}`).join(" or ")})`, ...whseFilters].join(" and "),
        top: 5000,
      });
      all.push(...rows);
    }
    all.sort((a, b) => String(a.PartNum).localeCompare(String(b.PartNum)) || String(a.WarehouseCode).localeCompare(String(b.WarehouseCode)));
    const startIdx = (opts.page - 1) * PAGE_SIZE;
    whseRows = all.slice(startIdx, startIdx + PAGE_SIZE);
    hasNext = all.length > startIdx + PAGE_SIZE;
  } else {
    const { rows } = await getPartWarehouses({
      filter: whseFilters.join(" and ") || undefined,
      orderby: "PartNum,WarehouseCode",
      top: PAGE_SIZE + 1,
      skip: (opts.page - 1) * PAGE_SIZE,
    });
    ({ rows: whseRows, hasNext } = paged(rows));
  }

  const info = await getPartInfo([...new Set(whseRows.map((r) => String(r.PartNum)))]);
  return {
    hasNext,
    rows: whseRows.map((r) => {
      const partNum = String(r.PartNum);
      const onHand = Number(r.OnHandQty) || 0;
      const min = Number(r.MinimumQty) || 0;
      return {
        PartNum: partNum,
        PartDescription: info.get(partNum)?.desc ?? "",
        Warehouse: `${r.WarehouseCode} ${r.WarehouseCodeDescription ?? ""}`.trim(),
        OnHandQty: onHand,
        MinimumQty: min,
        UM: info.get(partNum)?.um ?? "",
        Status: stockStatus(onHand, min),
      };
    }),
  };
}
