import Form from "next/form";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { BaqTable } from "@/components/baq-table";
import { Pager } from "@/components/pager";
import { getIssues, getRequesters, getWarehouseOptions, ISSUE_TYPES, isIssueType, type IssueType } from "@/lib/inventory";
import { currentMonth, money, MONTH_PATTERN, monthLabel } from "@/lib/month";

type Filters = { q: string; month: string; type: IssueType; warehouse: string; page: number };

function readFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    q: str(sp.q),
    month: MONTH_PATTERN.test(str(sp.month)) ? str(sp.month) : currentMonth(),
    type: isIssueType(sp.type) ? sp.type : "STK-UKN",
    warehouse: str(sp.warehouse),
    page: Math.max(1, Number(sp.page) || 1),
  };
}

const inputClass = "h-9 rounded border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function FilterForm({ f, warehouses = [] }: { f?: Filters; warehouses?: { code: string; name: string }[] }) {
  return (
    <Form action="/issues" className="flex flex-wrap gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={f?.q} placeholder="รหัสสินค้า, เลขที่ใบเบิก, ชื่อ/รหัสผู้ขอเบิก หรือแผนก" className={`${inputClass} w-full pl-9`} />
      </div>
      <input type="month" name="month" defaultValue={f?.month} className={inputClass} />
      <select name="type" defaultValue={f?.type ?? "STK-UKN"} className={inputClass}>
        {Object.entries(ISSUE_TYPES).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      <select name="warehouse" defaultValue={f?.warehouse ?? ""} className={inputClass}>
        <option value="">ทุกคลัง</option>
        {warehouses.map((w) => (
          <option key={w.code} value={w.code}>
            {w.code} — {w.name}
          </option>
        ))}
      </select>
      <button type="submit" className="h-9 rounded bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90">
        ค้นหา
      </button>
    </Form>
  );
}

// ฟอร์มแยก Suspense: แสดงค่าที่ค้นอยู่และรายชื่อคลัง โดยไม่ต้องรอรายการเบิก
async function FilterFormWithValues({ searchParams }: PageProps<"/issues">) {
  const f = readFilters(await searchParams);
  const warehouses = await getWarehouseOptions().catch(() => []);
  return <FilterForm key={JSON.stringify(f)} f={f} warehouses={warehouses} />;
}

async function IssueResults({ searchParams }: PageProps<"/issues">) {
  const f = readFilters(await searchParams);

  let result;
  try {
    result = await getIssues(f);
  } catch (err) {
    return (
      <div className="rounded border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
        ดึงรายการเบิกไม่สำเร็จ: {err instanceof Error ? err.message : String(err)}
      </div>
    );
  }

  const misc = f.type === "STK-UKN";
  const rows = result.rows.map((r) => ({
    TranDate: r.TranDate,
    TranReference: r.TranReference,
    Requester: r.RequesterName,
    Dept: r.RequesterDept,
    Purpose: r.RequesterPurpose,
    PartNum: r.PartNum,
    PartDescription: r.PartNumPartDescription,
    Warehouse: r.WarehouseDesc || r.WareHouseCode,
    BinNum: r.BinNum,
    TranQty: r.TranQty,
    UM: r.UM,
    JobNum: r.JobNum,
    EntryPerson: r.EntryPersonName || r.EntryPerson,
    ExtCost: r.ExtCost,
  }));

  // เบิกทั่วไป: ผู้ขอเบิกมาจากใบขอเบิก, EntryPerson คือ Store ที่จ่ายของ — เบิกเข้า Job: ไม่มีใบขอเบิก
  const columns: Record<string, string> = misc
    ? {
        TranDate: "วันที่",
        TranReference: "เลขที่ใบเบิก",
        Requester: "ผู้ขอเบิก",
        Dept: "แผนก",
        PartNum: "รหัสสินค้า",
        PartDescription: "รายละเอียด",
        TranQty: "จำนวน",
        UM: "หน่วย",
        ExtCost: "มูลค่า",
        Purpose: "วัตถุประสงค์",
        Warehouse: "คลัง",
        EntryPerson: "Store ผู้จ่าย",
      }
    : {
        TranDate: "วันที่",
        TranReference: "เลขที่อ้างอิง",
        PartNum: "รหัสสินค้า",
        PartDescription: "รายละเอียด",
        Warehouse: "คลัง",
        BinNum: "Bin",
        TranQty: "จำนวน",
        UM: "หน่วย",
        JobNum: "Job",
        EntryPerson: "ผู้บันทึก",
        ExtCost: "มูลค่า",
      };

  return (
    <section className="rounded border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-base font-semibold">
          {ISSUE_TYPES[f.type]} · {monthLabel(f.month)}
        </h2>
        <Pager path="/issues" params={{ q: f.q, month: f.month, type: f.type, warehouse: f.warehouse }} page={f.page} hasNext={result.hasNext} />
      </header>
      <div className="p-4">
        <BaqTable
          rows={rows}
          columns={columns}
          link={{ column: "PartNum", href: (row) => `/stock?${new URLSearchParams({ q: String(row.PartNum) })}` }}
        />
      </div>
    </section>
  );
}

// รายชื่อผู้ขอเบิกทั้งเดือน (ไม่ใช้คำค้น q) — คลิกรหัสพนักงานเพื่อกรองรายการของคนนั้น
async function RequesterSummary({ searchParams }: PageProps<"/issues">) {
  const f = readFilters(await searchParams);

  // เบิกเข้า Job ไม่มีใบขอเบิก (ส่วนใหญ่เป็น Backflush จากการผลิต) จึงไม่มีผู้ขอเบิกให้สรุป
  if (f.type !== "STK-UKN") {
    return (
      <p className="rounded border bg-card p-4 text-sm text-muted-foreground">
        สรุปผู้ขอเบิกมีเฉพาะ “{ISSUE_TYPES["STK-UKN"]}” — เบิกเข้า Job ไม่มีใบขอเบิก จึงไม่มีชื่อผู้ขอ
      </p>
    );
  }

  let requesters;
  try {
    requesters = await getRequesters({ month: f.month, type: f.type, warehouse: f.warehouse });
  } catch (err) {
    return (
      <div className="rounded border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
        ดึงรายชื่อผู้ขอเบิกไม่สำเร็จ: {err instanceof Error ? err.message : String(err)}
      </div>
    );
  }

  const rows = requesters.map((s) => ({
    EmpID: s.empId,
    Name: s.name,
    Dept: s.dept,
    DocCount: s.docCount,
    TranCount: s.tranCount,
    Value: money(s.value),
  }));

  return (
    <section className="rounded border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-base font-semibold">รายชื่อผู้ขอเบิก · {monthLabel(f.month)}</h2>
        <span className="text-sm text-muted-foreground">{requesters.length.toLocaleString("th-TH")} คน</span>
      </header>
      <div className="p-4">
        <BaqTable
          rows={rows}
          columns={{
            EmpID: "รหัสพนักงาน",
            Name: "ชื่อผู้ขอเบิก",
            Dept: "แผนก",
            DocCount: "ใบเบิก",
            TranCount: "รายการ",
            Value: "มูลค่ารวม",
          }}
          link={{
            column: "EmpID",
            href: (row) =>
              `/issues?${new URLSearchParams({ q: String(row.EmpID), month: f.month, type: f.type, ...(f.warehouse && { warehouse: f.warehouse }) })}`,
          }}
        />
      </div>
    </section>
  );
}

export default function Page(props: PageProps<"/issues">) {
  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">รายการเบิกของ</h1>
      <Suspense fallback={<FilterForm />}>
        <FilterFormWithValues {...props} />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">กำลังโหลดรายการเบิกจาก Epicor... (เบิกเข้า Job อาจใช้เวลา 10–15 วินาที)</p>}>
        <IssueResults {...props} />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">กำลังรวมรายชื่อผู้ขอเบิก...</p>}>
        <RequesterSummary {...props} />
      </Suspense>
    </div>
  );
}
