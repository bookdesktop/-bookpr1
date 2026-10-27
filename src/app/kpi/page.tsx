import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Banknote, ChevronLeft, ChevronRight, FileCheck, Receipt, Wallet } from "lucide-react";
import { BaqTable } from "@/components/baq-table";
import { EpicorError } from "@/lib/epicor";
import { getMonthlyPrKpi, prPaymentBaq } from "@/lib/kpi";
import { currentMonth, money, MONTH_PATTERN, monthLabel, shiftMonth } from "@/lib/month";
import { KpiCard } from "@/components/kpi-card";

async function KpiContent({ searchParams }: PageProps<"/kpi">) {
  const sp = await searchParams;
  const month = typeof sp.month === "string" && MONTH_PATTERN.test(sp.month) ? sp.month : currentMonth();

  let kpi;
  try {
    kpi = await getMonthlyPrKpi(month);
  } catch (err) {
    const missingBaq = err instanceof EpicorError && /Dynamic query is not found/i.test(err.message);
    return (
      <div className="rounded border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
        {missingBaq ? (
          <>
            ยังไม่พบ BAQ <code className="font-mono">{prPaymentBaq()}</code> ใน Epicor — ให้ทีม Epicor สร้างตาม{" "}
            <code className="font-mono">docs/BAQ-PR-PAYMENT.md</code>
          </>
        ) : (
          <>ดึงข้อมูล KPI ไม่สำเร็จ: {err instanceof Error ? err.message : String(err)}</>
        )}
      </div>
    );
  }

  const rows = kpi.prs.map((pr) => ({
    ReqNum: pr.reqNum,
    Requestor: pr.requestor,
    Vendors: pr.vendors.join(", "),
    Invoices: pr.invoices.join(", "),
    PrValue: pr.prValue,
    Paid: pr.paid,
    Withholding: pr.withholding,
    NetPaid: Math.round((pr.paid - pr.withholding) * 100) / 100,
    LastPayDate: pr.lastPayDate,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/kpi?month=${shiftMonth(month, -1)}`} className="inline-flex size-9 items-center justify-center rounded border bg-card hover:bg-muted" aria-label="เดือนก่อน">
          <ChevronLeft className="size-4" />
        </Link>
        <Form action="/kpi" className="flex gap-2">
          <input type="month" name="month" defaultValue={month} className="h-9 rounded border bg-card px-3 text-sm" />
          <button type="submit" className="h-9 rounded bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90">
            แสดง
          </button>
        </Form>
        <Link href={`/kpi?month=${shiftMonth(month, 1)}`} className="inline-flex size-9 items-center justify-center rounded border bg-card hover:bg-muted" aria-label="เดือนถัดไป">
          <ChevronRight className="size-4" />
        </Link>
        <span className="ml-2 text-sm text-muted-foreground">{monthLabel(month)} · นับตามวันที่จ่ายเงินจริง</span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="ยอดชำระ PR" value={money(kpi.totalPaid)} sub="บาท (รวมภาษีมูลค่าเพิ่ม)" icon={Wallet} tone="primary" />
        <KpiCard
          label="เงินที่จ่ายออกจริง"
          value={money(kpi.totalPaid - kpi.totalWithholding)}
          sub={`หลังหักภาษี ณ ที่จ่าย ${money(kpi.totalWithholding)} บาท`}
          icon={Banknote}
          tone="success"
        />
        <KpiCard label="จำนวน PR ที่มีการจ่าย" value={kpi.prCount.toLocaleString("th-TH")} sub="ใบ" icon={FileCheck} tone="info" />
        <KpiCard
          label="รายการจ่ายเงิน"
          value={kpi.paymentCount.toLocaleString("th-TH")}
          sub={`ครอบคลุมใบแจ้งหนี้ ${kpi.invoiceCount.toLocaleString("th-TH")} ใบ`}
          icon={Receipt}
          tone="warning"
        />
      </div>

      <section className="rounded border bg-card">
        <header className="border-b px-4 py-3">
          <h2 className="text-base font-semibold">ยอดชำระแยกตาม PR</h2>
        </header>
        <div className="p-4">
          <BaqTable
            rows={rows}
            columns={{
              ReqNum: "เลขที่ PR",
              Requestor: "ผู้ขอ",
              Vendors: "ผู้ขาย",
              Invoices: "ใบแจ้งหนี้",
              PrValue: "มูลค่า PR",
              Paid: "ยอดชำระ",
              Withholding: "หัก ณ ที่จ่าย",
              NetPaid: "จ่ายจริง",
              LastPayDate: "วันที่จ่ายล่าสุด",
            }}
            link={{ column: "ReqNum", href: (row) => `/pr/${row.ReqNum}` }}
          />
        </div>
      </section>
    </div>
  );
}

export default function Page(props: PageProps<"/kpi">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">KPI รายเดือน — ยอดชำระ PR</h1>
      <Suspense fallback={<p className="text-muted-foreground">กำลังคำนวณ KPI จาก Epicor...</p>}>
        <KpiContent {...props} />
      </Suspense>
    </div>
  );
}
