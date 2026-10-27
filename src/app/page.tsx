import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BaqPicker } from "@/components/baq-picker";

// รายการ BAQ ที่ใช้บ่อย ตั้งใน env เช่น EPICOR_BAQ_LIST=zCustomerList,zOpenOrders (อ่านตอนรัน ไม่ใช่ตอน build)
async function BaqList() {
  await connection();
  const baqList = (process.env.EPICOR_BAQ_LIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (baqList.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {baqList.map((id) => (
        <li key={id}>
          <Link href={`/baq/${id}`} className="block rounded-md border px-4 py-3 hover:bg-muted/50">
            {id}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Epicor BAQ Viewer</h1>
      <Link href="/pr" className="block rounded-md border px-4 py-3 font-medium hover:bg-muted/50">
        Purchase Requisition (PR) →
      </Link>
      <BaqPicker />
      <Suspense fallback={null}>
        <BaqList />
      </Suspense>
    </div>
  );
}
