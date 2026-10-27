import type { LucideIcon } from "lucide-react";

// การ์ดตัวเลข KPI ตามแบบ Velzon (docs/DESIGN.md ข้อ 5.4)
export function KpiCard({ label, value, sub, icon: Icon, tone }: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "info";
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
  }[tone];

  return (
    <div className="rounded border bg-card p-4 transition hover:-translate-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-[22px] font-semibold tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <span className={`flex size-12 items-center justify-center rounded ${toneClass}`}>
          <Icon className="size-6" />
        </span>
      </div>
    </div>
  );
}
