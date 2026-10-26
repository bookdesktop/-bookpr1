import Link from "next/link";
import { Suspense } from "react";
import { BaqTable } from "@/components/baq-table";
import { getRequisitions } from "@/lib/epicor";

const PAGE_SIZE = 50;

const COLUMNS = {
  ReqNum: "เลขที่ PR",
  ReqDate: "วันที่ขอ",
  RequestorID: "ผู้ขอ",
  ReqUserId: "ผู้สร้าง",
  CurrDispatcherID: "ผู้อนุมัติปัจจุบัน",
  ReqActionID: "Action",
  StatusType: "สถานะ",
  OpenReq: "Open",
  CommentText: "หมายเหตุ",
};

function buildFilter(q: string, status: string) {
  const parts: string[] = [];
  if (status !== "all") parts.push("OpenReq eq true");
  if (q) {
    parts.push(/^\d+$/.test(q) ? `ReqNum eq ${q}` : `contains(RequestorID,'${q.replace(/'/g, "''")}')`);
  }
  return parts.join(" and ") || undefined;
}

async function PrList({ searchParams }: PageProps<"/pr">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = sp.status === "all" ? "all" : "open";

  let result;
  try {
    result = await getRequisitions({
      top: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      filter: buildFilter(q, status),
      orderby: "ReqNum desc",
    });
  } catch (err) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        ดึงข้อมูล PR ไม่สำเร็จ: {err instanceof Error ? err.message : String(err)}
      </div>
    );
  }

  const { rows, count } = result;
  const hasNext = count != null ? page * PAGE_SIZE < count : rows.length === PAGE_SIZE;
  const pageHref = (p: number) => {
    const params = new URLSearchParams({ page: String(p), status });
    if (q) params.set("q", q);
    return `/pr?${params}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="เลขที่ PR หรือรหัสผู้ขอ"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="open">เฉพาะที่ยังเปิดอยู่</option>
          <option value="all">ทั้งหมด</option>
        </select>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          ค้นหา
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        {count != null ? `ทั้งหมด ${count.toLocaleString("th-TH")} รายการ · ` : ""}หน้า {page}
      </p>
      <BaqTable rows={rows} columns={COLUMNS} link={{ column: "ReqNum", href: (row) => `/pr/${row.ReqNum}` }} />
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

export default function Page(props: PageProps<"/pr">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Purchase Requisition (PR)</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← หน้าแรก
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">กำลังโหลด PR จาก Epicor...</p>}>
        <PrList {...props} />
      </Suspense>
    </main>
  );
}
