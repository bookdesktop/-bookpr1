// เดือนในรูปแบบ "YYYY-MM" ตามเวลาไทย

export const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date());
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("th-TH", { month: "long", year: "numeric", timeZone: "UTC" });
}

// ช่วงวันที่สำหรับ OData $filter — Epicor ส่งวันที่เป็นเวลาไทย (+07:00)
export function monthRange(month: string) {
  return { start: `${month}-01T00:00:00+07:00`, end: `${shiftMonth(month, 1)}-01T00:00:00+07:00` };
}

export const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
