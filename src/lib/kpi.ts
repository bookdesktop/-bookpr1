// สรุปยอดชำระเงินที่ผูกกับ PR รายเดือน จาก BAQ zPRPayment (ดู docs/BAQ-PR-PAYMENT.md)

import { getBaqData } from "@/lib/epicor";
import { summarizePrPayments, type MonthlyKpi } from "@/lib/kpi-calc";

export type { MonthlyKpi, PrPaymentSummary } from "@/lib/kpi-calc";

export const PR_PAYMENT_BAQ = process.env.EPICOR_BAQ_PR_PAYMENT ?? "zPRPayment";

// month = "YYYY-MM"
function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  // Epicor ส่งวันที่เป็นเวลาไทย (+07:00)
  return { start: `${month}-01T00:00:00+07:00`, end: `${next}-01T00:00:00+07:00` };
}

export async function getMonthlyPrKpi(month: string): Promise<MonthlyKpi> {
  const { start, end } = monthRange(month);
  const { rows: raw } = await getBaqData(PR_PAYMENT_BAQ, {
    filter: `APTran_TranDate ge ${start} and APTran_TranDate lt ${end}`,
    top: 10000,
  });
  return summarizePrPayments(raw, month);
}
