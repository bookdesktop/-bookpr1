import Link from "next/link";
import { Suspense } from "react";
import { BaqTable } from "@/components/baq-table";
import { getBaqData } from "@/lib/epicor";

const PAGE_SIZE = 50;

async function BaqData({ params, searchParams }: PageProps<"/baq/[baqId]">) {
  const { baqId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = typeof sp.filter === "string" ? sp.filter : undefined;

  let result;
  try {
    result = await getBaqData(baqId, {
      top: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      filter,
    });
  } catch (err) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        ดึงข้อมูล BAQ ไม่สำเร็จ: {err instanceof Error ? err.message : String(err)}
      </div>
    );
  }

  const { rows, count } = result;
  const hasNext = count != null ? page * PAGE_SIZE < count : rows.length === PAGE_SIZE;
  const pageHref = (p: number) => {
    const q = new URLSearchParams({ page: String(p) });
    if (filter) q.set("filter", filter);
    return `/baq/${baqId}?${q}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {count != null ? `ทั้งหมด ${count.toLocaleString("th-TH")} รายการ · ` : ""}หน้า {page}
      </p>
      <BaqTable rows={rows} />
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={pageHref(page - 1)} className="rounded-md border px-3 py-1.5 text-sm">
            ← ก่อนหน้า
          </Link>
        )}
        {hasNext && (
          <Link href={pageHref(page + 1)} className="rounded-md border px-3 py-1.5 text-sm">
            ถัดไป →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Page(props: PageProps<"/baq/[baqId]">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Epicor BAQ</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← เลือก BAQ อื่น
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">กำลังโหลดข้อมูลจาก Epicor...</p>}>
        <BaqData {...props} />
      </Suspense>
    </div>
  );
}
