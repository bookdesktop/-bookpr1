import Link from "next/link";
import { BaqPicker } from "@/components/baq-picker";

// รายการ BAQ ที่ใช้บ่อย ตั้งใน .env.local เช่น EPICOR_BAQ_LIST=zCustomerList,zOpenOrders
const baqList = (process.env.EPICOR_BAQ_LIST ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Epicor BAQ Viewer</h1>
      <Link href="/pr" className="block rounded-md border px-4 py-3 font-medium hover:bg-muted/50">
        Purchase Requisition (PR) →
      </Link>
      <BaqPicker />
      {baqList.length > 0 && (
        <ul className="flex flex-col gap-2">
          {baqList.map((id) => (
            <li key={id}>
              <Link href={`/baq/${id}`} className="block rounded-md border px-4 py-3 hover:bg-muted/50">
                {id}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
