import Link from "next/link";

// ปุ่มก่อนหน้า/ถัดไป — params คือ query string ปัจจุบัน (ไม่รวม page)
export function Pager({ path, params, page, hasNext }: {
  path: string;
  params: Record<string, string | undefined>;
  page: number;
  hasNext: boolean;
}) {
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    q.set("page", String(p));
    return `${path}?${q}`;
  };

  if (page <= 1 && !hasNext) return null;
  return (
    <div className="flex items-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} className="rounded border bg-card px-3 py-1.5 text-sm hover:bg-muted">
          ← ก่อนหน้า
        </Link>
      )}
      <span className="text-sm text-muted-foreground">หน้า {page}</span>
      {hasNext && (
        <Link href={href(page + 1)} className="rounded border bg-card px-3 py-1.5 text-sm hover:bg-muted">
          ถัดไป →
        </Link>
      )}
    </div>
  );
}
