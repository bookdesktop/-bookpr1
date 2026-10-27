import Form from "next/form";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { BaqTable } from "@/components/baq-table";
import { Pager } from "@/components/pager";
import { getStock, getWarehouseOptions } from "@/lib/inventory";

type Filters = { q: string; warehouse: string; inStockOnly: boolean; page: number };

function readFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    q: str(sp.q),
    warehouse: str(sp.warehouse),
    // ค่าเริ่มต้นแสดงเฉพาะที่มีของ — ติ๊กออกเพื่อดูรายการที่ยอดเป็น 0 ด้วย
    inStockOnly: sp.all !== "1",
    page: Math.max(1, Number(sp.page) || 1),
  };
}

const inputClass = "h-9 rounded border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function FilterForm({ f, warehouses = [] }: { f?: Filters; warehouses?: { code: string; name: string }[] }) {
  return (
    <Form action="/stock" className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={f?.q} placeholder="รหัสหรือชื่อสินค้า" className={`${inputClass} w-full pl-9`} />
      </div>
      <select name="warehouse" defaultValue={f?.warehouse ?? ""} className={inputClass}>
        <option value="">ทุกคลัง</option>
        {warehouses.map((w) => (
          <option key={w.code} value={w.code}>
            {w.code} — {w.name}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="all" value="1" defaultChecked={f ? !f.inStockOnly : false} className="size-4 accent-primary" />
        รวมรายการที่ยอดเป็น 0
      </label>
      <button type="submit" className="h-9 rounded bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90">
        ค้นหา
      </button>
    </Form>
  );
}

async function FilterFormWithValues({ searchParams }: PageProps<"/stock">) {
  const f = readFilters(await searchParams);
  const warehouses = await getWarehouseOptions().catch(() => []);
  return <FilterForm key={JSON.stringify(f)} f={f} warehouses={warehouses} />;
}

async function StockResults({ searchParams }: PageProps<"/stock">) {
  const f = readFilters(await searchParams);

  let result;
  try {
    result = await getStock(f);
  } catch (err) {
    return (
      <div className="rounded border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
        ดึงข้อมูล Stock ไม่สำเร็จ: {err instanceof Error ? err.message : String(err)}
      </div>
    );
  }

  return (
    <section className="rounded border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-base font-semibold">ยอดคงเหลือแยกตามคลัง</h2>
        <Pager
          path="/stock"
          params={{ q: f.q, warehouse: f.warehouse, all: f.inStockOnly ? undefined : "1" }}
          page={f.page}
          hasNext={result.hasNext}
        />
      </header>
      <div className="p-4">
        <BaqTable
          rows={result.rows}
          columns={{
            PartNum: "รหัสสินค้า",
            PartDescription: "ชื่อสินค้า",
            Warehouse: "คลัง",
            OnHandQty: "คงเหลือ",
            UM: "หน่วย",
            MinimumQty: "ขั้นต่ำ",
            Status: "สถานะ",
          }}
          link={{ column: "PartNum", href: (row) => `/issues?${new URLSearchParams({ q: String(row.PartNum) })}` }}
        />
      </div>
    </section>
  );
}

export default function Page(props: PageProps<"/stock">) {
  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Stock คงเหลือ</h1>
      <Suspense fallback={<FilterForm />}>
        <FilterFormWithValues {...props} />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">กำลังโหลดยอดคงเหลือจาก Epicor...</p>}>
        <StockResults {...props} />
      </Suspense>
    </div>
  );
}
