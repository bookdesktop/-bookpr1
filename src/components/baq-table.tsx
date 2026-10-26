import type { BaqRow } from "@/lib/epicor";

// คอลัมน์ BAQ มาในรูปแบบ Table_Field เช่น Customer_CustID -> "Customer · CustID"
function formatHeader(key: string) {
  const i = key.indexOf("_");
  return i > 0 ? `${key.slice(0, i)} · ${key.slice(i + 1)}` : key;
}

function formatCell(value: BaqRow[string]) {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "✓" : "";
  if (typeof value === "number") return value.toLocaleString("th-TH");
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString("th-TH");
  return value;
}

export function BaqTable({ rows }: { rows: BaqRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">ไม่พบข้อมูล</p>;
  }

  const columns = Object.keys(rows[0]).filter((key) => key !== "RowIdent" && key !== "SysRowID");

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {formatHeader(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/30">
              {columns.map((col) => (
                <td
                  key={col}
                  className={`px-3 py-2 whitespace-nowrap ${typeof row[col] === "number" ? "text-right tabular-nums" : ""}`}
                >
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
