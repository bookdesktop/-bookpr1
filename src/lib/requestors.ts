// สถิติ PR รายผู้ขอต่อเดือน
// - เปิด PR: นับตาม ReqHead.RequestDate ในเดือน (Erp.BO.ReqSvc/GetRows)
// - ชำระแล้ว: ยอดที่จ่ายจริงในเดือน จาก BAQ zPRPayment (PR อาจเปิดก่อนเดือนนี้)

import { fetchAll, getRequisitionsWithLines, getUsers } from "@/lib/epicor";
import { getMonthlyPrKpi } from "@/lib/kpi";
import { shiftMonth } from "@/lib/month";

export type RequestorStat = {
  requestorId: string;
  name: string;
  prCount: number;
  openPrCount: number;
  prValue: number;
  paid: number;
  paidPrCount: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getRequestorStats(month: string): Promise<RequestorStat[]> {
  const next = shiftMonth(month, 1);
  const [{ heads, lines }, kpi, users] = await Promise.all([
    getRequisitionsWithLines(`RequestDate >= '${month}-01' and RequestDate < '${next}-01'`),
    getMonthlyPrKpi(month),
    fetchAll(getUsers, { select: "UserID,Name" }),
  ]);

  // มูลค่า PR = ผลรวม ExtCost ของบรรทัด (สกุลเงินหลัก, BO คำนวณให้)
  const valueByReq = new Map<number, number>();
  for (const l of lines) {
    valueByReq.set(Number(l.ReqNum), (valueByReq.get(Number(l.ReqNum)) ?? 0) + (Number(l.ExtCost) || 0));
  }

  const names = new Map(users.map((u) => [String(u.UserID).toLowerCase(), String(u.Name ?? "")]));
  const stats = new Map<string, RequestorStat>();
  const statFor = (id: string, fallbackName = "") => {
    const key = id.toLowerCase();
    let s = stats.get(key);
    if (!s) {
      s = { requestorId: id, name: names.get(key) || fallbackName, prCount: 0, openPrCount: 0, prValue: 0, paid: 0, paidPrCount: 0 };
      stats.set(key, s);
    }
    return s;
  };

  for (const h of heads) {
    const s = statFor(String(h.RequestorID ?? ""), String(h.RequestorIDName ?? ""));
    s.prCount += 1;
    if (h.OpenReq) s.openPrCount += 1;
    s.prValue += valueByReq.get(Number(h.ReqNum)) ?? 0;
  }
  for (const pr of kpi.prs) {
    const s = statFor(pr.requestor);
    s.paid += pr.paid;
    s.paidPrCount += 1;
  }

  return [...stats.values()]
    .map((s) => ({ ...s, prValue: round2(s.prValue), paid: round2(s.paid) }))
    .sort((a, b) => b.prCount - a.prCount || b.paid - a.paid);
}
