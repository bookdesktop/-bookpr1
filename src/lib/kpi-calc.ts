// คำนวณ KPI ยอดชำระ PR จากแถวของ BAQ zPRPayment (ดู docs/BAQ-PR-PAYMENT.md ข้อ 5)
// แยกจากส่วนเรียก Epicor เพื่อให้ทดสอบสูตรได้โดยไม่ต้องต่อเซิร์ฟเวอร์

import type { BaqRow } from "@/lib/epicor";

export type PrPaymentSummary = {
  reqNum: number;
  requestor: string;
  prValue: number;
  paid: number;
  withholding: number;
  vendors: string[];
  invoices: string[];
  lastPayDate: string;
};

export type MonthlyKpi = {
  month: string;
  totalPaid: number;
  totalWithholding: number;
  prCount: number;
  paymentCount: number;
  invoiceCount: number;
  prs: PrPaymentSummary[];
};

const num = (v: BaqRow[string]) => (typeof v === "number" ? v : Number(v) || 0);
const str = (v: BaqRow[string]) => (v == null ? "" : String(v));
const round2 = (n: number) => Math.round(n * 100) / 100;

// มูลค่า PR line (สกุลเงินหลัก) — ReqDetail.ExtCost เป็นค่าคำนวณของ BO ไม่มีใน DB จึงคำนวณเอง
// CostPerCode: E = ต่อหน่วย, C = ต่อ 100, M = ต่อ 1000 (ตรงกับค่าของ BO 300/300 แถว)
const COST_PER_DIVISOR: Record<string, number> = { C: 100, M: 1000 };
const lineCost = (orderQty: BaqRow[string], unitCost: BaqRow[string], costPerCode: BaqRow[string]) =>
  (num(orderQty) * num(unitCost)) / (COST_PER_DIVISOR[str(costPerCode)] ?? 1);
const prLineCost = (r: BaqRow) => lineCost(r.ReqDetail_OrderQty, r.ReqDetail_UnitCost, r.ReqDetail_CostPerCode);

export function summarizePrPayments(raw: BaqRow[], month: string): MonthlyKpi {
  // กรองซ้ำฝั่งเว็บ เผื่อ timezone ของ server ไม่ตรง
  const rows = raw.filter((r) => str(r.APTran_TranDate).slice(0, 7) === month);

  // PO บรรทัดเดียวอาจมาจากหลาย PR line: แบ่งยอดตามมูลค่า PR ภายในกลุ่มเดียวกัน
  const groupKey = (r: BaqRow) =>
    `${r.APTran_HeadNum}|${r.APInvHed_VendorNum}|${r.APInvDtl_InvoiceNum}|${r.APInvDtl_InvoiceLine}`;
  const groups = new Map<string, BaqRow[]>();
  for (const r of rows) {
    const key = groupKey(r);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  // ผลรวมบรรทัดที่ผูก PO ของแต่ละใบแจ้งหนี้ (นับบรรทัดละครั้ง)
  const invoiceKey = (r: BaqRow) => `${r.APInvHed_VendorNum}|${r.APInvDtl_InvoiceNum}`;
  const lineAmt = (r: BaqRow) => num(r.APInvDtl_ExtCost) + num(r.APInvDtl_TotalTax);
  const poLines = new Map<string, Map<number, number>>();
  for (const r of rows) {
    const lines = poLines.get(invoiceKey(r)) ?? new Map<number, number>();
    lines.set(num(r.APInvDtl_InvoiceLine), lineAmt(r));
    poLines.set(invoiceKey(r), lines);
  }

  type PrAccumulator = PrPaymentSummary & { prLines: Map<number, number> };
  const prs = new Map<number, PrAccumulator>();
  const payments = new Set<string>();
  const invoices = new Set<string>();

  for (const group of groups.values()) {
    const first = group[0];
    const invoiceAmt = num(first.APInvHed_InvoiceAmt);
    if (invoiceAmt === 0) continue;

    // ตัวหาร = ค่าที่มากกว่าระหว่างยอดใบแจ้งหนี้ กับผลรวมบรรทัด PO
    // - ใบที่มีค่าใช้จ่ายอื่นไม่ผูก PO (ค่าขนส่ง ฯลฯ): ใช้ InvoiceAmt ส่วนนั้นไม่ถูกนับเข้า PR
    // - ใบที่มีบรรทัดติดลบไม่ผูก PO (หักมัดจำ ฯลฯ): ใช้ผลรวมบรรทัด PO ยอดที่แบ่งให้ PR จึงไม่เกินยอดจ่ายจริง
    const poTotal = [...(poLines.get(invoiceKey(first))?.values() ?? [])].reduce((a, b) => a + b, 0);
    const lineShare = lineAmt(first) / Math.max(invoiceAmt, poTotal);
    const linePaid = num(first.APTran_TranAmt) * lineShare;
    const lineWht = num(first.APTran_WithholdAmt) * lineShare;
    const groupPrValue = group.reduce((sum, r) => sum + prLineCost(r), 0);

    payments.add(str(first.APTran_HeadNum));
    invoices.add(`${first.APInvHed_VendorNum}|${first.APInvDtl_InvoiceNum}`);

    for (const r of group) {
      const prShare = groupPrValue > 0 ? prLineCost(r) / groupPrValue : 1 / group.length;
      const reqNum = num(r.ReqDetail_ReqNum);
      const pr: PrAccumulator = prs.get(reqNum) ?? {
        reqNum,
        requestor: str(r.ReqHead_RequestorID),
        prValue: 0,
        paid: 0,
        withholding: 0,
        vendors: [],
        invoices: [],
        lastPayDate: "",
        prLines: new Map(),
      };
      pr.paid += linePaid * prShare;
      pr.withholding += lineWht * prShare;
      pr.prLines.set(num(r.ReqDetail_ReqLine), prLineCost(r));
      const vendor = str(r.Vendor_Name);
      if (vendor && !pr.vendors.includes(vendor)) pr.vendors.push(vendor);
      const invoice = str(r.APInvDtl_InvoiceNum);
      if (!pr.invoices.includes(invoice)) pr.invoices.push(invoice);
      const payDate = str(r.APTran_TranDate);
      if (payDate > pr.lastPayDate) pr.lastPayDate = payDate;
      prs.set(reqNum, pr);
    }
  }

  const list = [...prs.values()]
    .map(({ prLines, ...pr }) => ({
      ...pr,
      // มูลค่า PR นับเฉพาะบรรทัดที่มีการจ่ายในเดือนนี้ บรรทัดละครั้ง
      prValue: round2([...prLines.values()].reduce((a, b) => a + b, 0)),
      paid: round2(pr.paid),
      withholding: round2(pr.withholding),
    }))
    .sort((a, b) => b.paid - a.paid);

  return {
    month,
    totalPaid: round2(list.reduce((sum, pr) => sum + pr.paid, 0)),
    totalWithholding: round2(list.reduce((sum, pr) => sum + pr.withholding, 0)),
    prCount: list.length,
    paymentCount: payments.size,
    invoiceCount: invoices.size,
    prs: list,
  };
}
