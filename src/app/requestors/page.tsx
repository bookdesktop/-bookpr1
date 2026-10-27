import Form from "next/form";
import { Suspense } from "react";
import { FileText, Search, Users, Wallet } from "lucide-react";
import { BaqTable } from "@/components/baq-table";
import { KpiCard } from "@/components/kpi-card";
import { currentMonth, money, MONTH_PATTERN, monthLabel } from "@/lib/month";
import { getRequestorStats } from "@/lib/requestors";

function SearchForm({ q = "", month = "" }: { q?: string; month?: string }) {
  return (
    <Form action="/requestors" className="flex flex-wrap gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder="ชื่อ หรือรหัสผู้ขอ เช่น bancha"
          className="h-9 w-full rounded border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <input type="month" name="month" defaultValue={month} className="h-9 rounded border bg-card px-3 text-sm" />
      <button type="submit" className="h-9 rounded bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90">
        ค้นหา
      </button>
    </Form>
  );
}

// แยก Suspense ให้ฟอร์ม: อ่าน searchParams ได้ทันทีโดยไม่ต้องรอข้อมูลจาก Epicor
async function SearchFormWithValues({ searchParams }: PageProps<"/requestors">) {
  const sp = await searchParams;
  return (
    <SearchForm
      key={`${sp.q ?? ""}|${sp.month ?? ""}`}
      q={typeof sp.q === "string" ? sp.q : ""}
      month={typeof sp.month === "string" && MONTH_PATTERN.test(sp.month) ? sp.month : currentMonth()}
    />
  );
}

async function RequestorResults({ searchParams }: PageProps<"/requestors">) {
  const sp = await searchParams;
  const month = typeof sp.month === "string" && MONTH_PATTERN.test(sp.month) ? sp.month : currentMonth();
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  let stats;
  try {
    stats = await getRequestorStats(month);
  } catch (err) {
    return (
      <div className="rounded border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
        ดึงข้อมูลผู้ขอไม่สำเร็จ: {err instanceof Error ? err.message : String(err)}
      </div>
    );
  }

  const needle = q.toLowerCase();
  const matched = needle
    ? stats.filter((s) => s.requestorId.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle))
    : stats;

  const totals = matched.reduce(
    (t, s) => ({ prCount: t.prCount + s.prCount, prValue: t.prValue + s.prValue, paid: t.paid + s.paid }),
    { prCount: 0, prValue: 0, paid: 0 },
  );

  const rows = matched.map((s) => ({
    RequestorID: s.requestorId,
    Name: s.name,
    PrCount: s.prCount,
    OpenPrCount: s.openPrCount,
    PrValue: s.prValue,
    PaidPrCount: s.paidPrCount,
    Paid: s.paid,
  }));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {monthLabel(month)}
        {q && (
          <>
            {" "}
            · ค้นหา “{q}” พบ {matched.length.toLocaleString("th-TH")} คน
          </>
        )}
      </p>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="ผู้ขอ" value={matched.length.toLocaleString("th-TH")} sub="คน" icon={Users} tone="info" />
        <KpiCard label="PR ที่เปิดในเดือน" value={totals.prCount.toLocaleString("th-TH")} sub="ใบ" icon={FileText} tone="primary" />
        <KpiCard label="มูลค่า PR ที่เปิด" value={money(totals.prValue)} sub="บาท (ราคาประเมินตอนขอ)" icon={FileText} tone="warning" />
        <KpiCard label="ยอดชำระในเดือน" value={money(totals.paid)} sub="บาท (ตามวันที่จ่ายจริง)" icon={Wallet} tone="success" />
      </div>

      <section className="rounded border bg-card">
        <header className="border-b px-4 py-3">
          <h2 className="text-base font-semibold">แยกตามผู้ขอ</h2>
        </header>
        <div className="p-4">
          <BaqTable
            rows={rows}
            columns={{
              RequestorID: "รหัสผู้ขอ",
              Name: "ชื่อ",
              PrCount: "PR ที่เปิด (ใบ)",
              OpenPrCount: "ยังเปิดอยู่",
              PrValue: "มูลค่า PR ที่เปิด",
              PaidPrCount: "PR ที่มีการจ่าย",
              Paid: "ยอดชำระในเดือน",
            }}
            link={{
              column: "RequestorID",
              href: (row) => `/pr?${new URLSearchParams({ q: String(row.RequestorID), status: "all" })}`,
            }}
          />
        </div>
      </section>
    </div>
  );
}

export default function Page(props: PageProps<"/requestors">) {
  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">ค้นหาผู้ขอ PR</h1>

      <Suspense fallback={<SearchForm />}>
        <SearchFormWithValues {...props} />
      </Suspense>

      <Suspense fallback={<p className="text-muted-foreground">กำลังรวมข้อมูลจาก Epicor...</p>}>
        <RequestorResults {...props} />
      </Suspense>
    </div>
  );
}
