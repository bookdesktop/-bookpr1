import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BaqTable } from "@/components/baq-table";
import { getRequisition } from "@/lib/epicor";

const HEADER_FIELDS = {
  RequestDate: "วันที่ขอ",
  RequestorID: "ผู้ขอ",
  RequestorIDName: "ชื่อผู้ขอ",
  ReqUserId: "ผู้สร้าง",
  CurrDispatcherID: "ผู้อนุมัติปัจจุบัน",
  ReqActionID: "Action",
  StatusDesc: "สถานะ",
  OpenReq: "Open",
  ShipName: "ส่งถึง",
  CommentText: "หมายเหตุ",
};

const LINE_COLUMNS = {
  ReqLine: "บรรทัด",
  PartNum: "Part",
  LineDesc: "รายละเอียด",
  OrderQty: "จำนวน",
  IUM: "หน่วย",
  DocUnitCost: "ราคาต่อหน่วย",
  DueDate: "วันที่ต้องการ",
  VendorNumName: "ผู้ขาย",
  PONUM: "PO",
  OpenLine: "Open",
};

function formatValue(value: unknown) {
  if (value == null || value === "") return "-";
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString("th-TH");
  }
  return String(value);
}

async function PrDetail({ params }: PageProps<"/pr/[reqNum]">) {
  const { reqNum } = await params;
  if (!/^\d+$/.test(reqNum)) notFound();

  let data;
  try {
    data = await getRequisition(Number(reqNum));
  } catch (err) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        ดึงข้อมูล PR ไม่สำเร็จ: {err instanceof Error ? err.message : String(err)}
      </div>
    );
  }

  const { header, lines } = data;
  if (!header) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">PR #{reqNum}</h1>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(HEADER_FIELDS)
          .filter(([key]) => key in header)
          .map(([key, label]) => (
            <div key={key}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{formatValue(header[key])}</dd>
            </div>
          ))}
      </dl>
      <h2 className="text-lg font-semibold">รายการ ({lines.length})</h2>
      <BaqTable rows={lines} columns={LINE_COLUMNS} />
    </div>
  );
}

export default function Page(props: PageProps<"/pr/[reqNum]">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <Link href="/pr" className="text-sm text-muted-foreground hover:underline">
        ← กลับไปรายการ PR
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">กำลังโหลด PR จาก Epicor...</p>}>
        <PrDetail {...props} />
      </Suspense>
    </div>
  );
}
