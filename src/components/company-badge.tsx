import { connection } from "next/server";
import { Building2 } from "lucide-react";

// กล่องผู้ใช้ของ Velzon: พื้นเทาเต็มความสูง header
// อ่าน EPICOR_COMPANY ตอนรัน (หลัง connection()) ไม่ใช่ตอน build — image เดียวใช้ได้หลายบริษัท/หลาย environment
export async function CompanyBadge() {
  await connection();
  const company = process.env.EPICOR_COMPANY;
  if (!company) return null;

  return (
    <div className="ml-2 flex h-full items-center gap-2.5 bg-muted px-4 lg:px-5">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Building2 className="size-4" />
      </span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-[13px] font-medium text-foreground">Company {company}</span>
        <span className="text-xs text-muted-foreground">Epicor ERP</span>
      </span>
    </div>
  );
}
