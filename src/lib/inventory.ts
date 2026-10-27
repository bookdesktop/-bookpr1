// รายการเบิกของ (PartTran) และ Stock คงเหลือ (PartWhse)

import {
  getPartTrans,
  getParts,
  getPartWarehouses,
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

export async function getIssues(opts: {
  month: string;
  type: IssueType;
  q?: string;
  warehouse?: string;
  page: number;
}): Promise<Paged<BaqRow>> {
  const { start, end } = monthRange(opts.month);
  const parts = [`TranDate ge ${start}`, `TranDate lt ${end}`, `TranType eq ${odataString(opts.type)}`];
  if (opts.warehouse) parts.push(`WareHouseCode eq ${odataString(opts.warehouse)}`);
  if (opts.q) {
    const q = odataString(opts.q);
    parts.push(`(contains(PartNum,${q}) or contains(TranReference,${q}) or contains(EntryPerson,${q}))`);
  }

  const { rows } = await getPartTrans({
    filter: parts.join(" and "),
    orderby: "TranDate desc,TranNum desc",
    top: PAGE_SIZE + 1,
    skip: (opts.page - 1) * PAGE_SIZE,
  });
  return paged(rows);
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
