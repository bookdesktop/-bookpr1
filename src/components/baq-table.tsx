import Link from "next/link";
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

type BaqTableProps = {
  rows: BaqRow[];
  // คอลัมน์ที่ต้องการแสดง (key -> หัวตาราง) คอลัมน์ที่ไม่มีในข้อมูลจะถูกข้าม ถ้าไม่ระบุจะแสดงทุกคอลัมน์
  columns?: Record<string, string>;
  // ทำให้คอลัมน์นี้เป็นลิงก์
  link?: { column: string; href: (row: BaqRow) => string };
};

export function BaqTable({ rows, columns: columnLabels, link }: BaqTableProps) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">ไม่พบข้อมูล</p>;
  }

  const available = Object.keys(rows[0]);
  const preferred = columnLabels ? Object.keys(columnLabels).filter((key) => available.includes(key)) : [];
  const columns =
    preferred.length > 0 ? preferred : available.filter((key) => key !== "RowIdent" && key !== "SysRowID" && key !== "RowMod");

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {columnLabels?.[col] ?? formatHeader(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/60">
              {columns.map((col) => (
                <td
                  key={col}
                  className={`px-3 py-2 whitespace-nowrap ${typeof row[col] === "number" ? "text-right tabular-nums" : ""}`}
                >
                  {link?.column === col ? (
                    <Link href={link.href(row)} className="font-medium text-primary hover:underline">
                      {formatCell(row[col])}
                    </Link>
                  ) : (
                    formatCell(row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
