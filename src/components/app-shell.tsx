"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FileText, House, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "หน้าหลัก", icon: House },
  { href: "/pr", label: "Purchase Requisition", icon: FileText },
];

function isActive(pathname: string | undefined, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname?: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// usePathname ต้องอยู่ใน Suspense เพราะมี route ที่ param รู้ตอน request เท่านั้น (เช่น /pr/[reqNum])
function ActiveNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <NavLinks pathname={usePathname()} onNavigate={onNavigate} />;
}

export function AppShell({ company, children }: { company?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-svh">
      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={close} aria-hidden />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform",
          "md:sticky md:top-0 md:z-auto md:h-svh md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link href="/" onClick={close} className="font-semibold">
            Epicor Web
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={close} aria-label="ปิดเมนู">
            <X />
          </Button>
        </div>
        <Suspense fallback={<NavLinks />}>
          <ActiveNavLinks onNavigate={close} />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="เปิดเมนู">
            <Menu />
          </Button>
          <span className="font-semibold md:hidden">Epicor Web</span>
          {company && (
            <span className="ml-auto rounded-md border px-2.5 py-1 text-xs text-muted-foreground">Company {company}</span>
          )}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
