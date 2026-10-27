// สรุปยอดชำระเงินที่ผูกกับ PR รายเดือน จาก BAQ zPRPayment (ดู docs/BAQ-PR-PAYMENT.md)

import { getBaqData } from "@/lib/epicor";
import { summarizePrPayments, type MonthlyKpi } from "@/lib/kpi-calc";
import { monthRange } from "@/lib/month";

export type { MonthlyKpi, PrPaymentSummary } from "@/lib/kpi-calc";

export const PR_PAYMENT_BAQ = process.env.EPICOR_BAQ_PR_PAYMENT ?? "zPRPayment";

export async function getMonthlyPrKpi(month: string): Promise<MonthlyKpi> {
  const { start, end } = monthRange(month);
  const { rows: raw } = await getBaqData(PR_PAYMENT_BAQ, {
    filter: `APTran_TranDate ge ${start} and APTran_TranDate lt ${end}`,
    top: 10000,
  });
  return summarizePrPayments(raw, month);
}
