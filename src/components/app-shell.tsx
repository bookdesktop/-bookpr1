"use client";

import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Boxes, ChartColumn, PackageMinus, FileText, UserSearch, LayoutDashboard, Menu, Moon, Search, Sun, X } from "lucide-react";
import { toggleTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// เมนูตามรูปแบบ Velzon: แบ่งเป็นกลุ่ม แต่ละกลุ่มมีหัวข้อ (menu-title)
const NAV_GROUPS = [
  {
    title: "Menu",
    items: [
      { href: "/", label: "หน้าหลัก", icon: LayoutDashboard },
      { href: "/kpi", label: "KPI รายเดือน", icon: ChartColumn },
      { href: "/requestors", label: "ค้นหาผู้ขอ", icon: UserSearch },
    ],
  },
  {
    title: "Epicor",
    items: [{ href: "/pr", label: "Purchase Requisition", icon: FileText }],
  },
  {
    title: "คลังสินค้า",
    items: [
      { href: "/issues", label: "รายการเบิกของ", icon: PackageMinus },
      { href: "/stock", label: "Stock คงเหลือ", icon: Boxes },
    ],
  },
];

function isActive(pathname: string | undefined, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

type NavProps = { pathname?: string; collapsed?: boolean; onNavigate?: () => void };

function NavLinks({ pathname, collapsed, onNavigate }: NavProps) {
  return (
    <nav className="flex-1 overflow-y-auto pb-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p
            className={cn(
              "px-6 pt-5 pb-2 text-[11px] font-semibold tracking-wider text-sidebar-foreground/70 uppercase",
              collapsed && "lg:hidden",
            )}
          >
            {group.title}
          </p>
          {collapsed && <div className="mx-auto my-3 hidden h-px w-8 bg-sidebar-border lg:block" />}
          <ul>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-2.5 text-[15px] transition-colors",
                      collapsed && "lg:justify-center lg:px-0",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:text-sidebar-primary",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" />
                    <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// usePathname ต้องอยู่ใน Suspense เพราะมี route ที่ param รู้ตอน request เท่านั้น (เช่น /pr/[reqNum])
function ActiveNavLinks(props: Omit<NavProps, "pathname">) {
  return <NavLinks pathname={usePathname()} {...props} />;
}

function HeaderIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-10 items-center justify-center rounded-full text-secondary-foreground transition-colors hover:bg-secondary-foreground/10"
    >
      {children}
    </button>
  );
}

// headerEnd: ส่วนท้ายขวาของ header (เช่นกล่อง Company) ส่งมาจาก server component
export function AppShell({ headerEnd, children }: { headerEnd?: React.ReactNode; children: React.ReactNode }) {
  // mobileOpen: drawer บนจอเล็ก / collapsed: ย่อ sidebar เหลือแต่ไอคอนบนจอใหญ่ (70px)
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const toggleMenu = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((c) => !c);
    else setMobileOpen((o) => !o);
  };

  return (
    <div className="flex min-h-svh">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeMobile} aria-hidden />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-sidebar-border bg-sidebar transition-[width,translate] duration-200",
          "lg:sticky lg:top-0 lg:z-auto lg:h-svh lg:translate-x-0",
          collapsed && "lg:w-[70px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className={cn("flex h-[70px] shrink-0 items-center justify-between px-5", collapsed && "lg:justify-center lg:px-0")}>
          <Link href="/" onClick={closeMobile} className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="flex size-8 items-center justify-center rounded bg-primary text-sm text-primary-foreground">
              EW
            </span>
            <span className={cn(collapsed && "lg:hidden")}>Epicor Web</span>
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="ปิดเมนู"
            className="inline-flex size-8 items-center justify-center rounded-full text-sidebar-foreground hover:bg-secondary-foreground/10 lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>
        <Suspense fallback={<NavLinks collapsed={collapsed} />}>
          <ActiveNavLinks collapsed={collapsed} onNavigate={closeMobile} />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[70px] shrink-0 items-center gap-2 border-b bg-card pl-3 lg:pl-4">
          <HeaderIconButton label="เมนู" onClick={toggleMenu}>
            <Menu className="size-[22px]" />
          </HeaderIconButton>

          <Form action="/pr" className="relative hidden md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input type="hidden" name="status" value="all" />
            <input
              name="q"
              placeholder="ค้นหา PR..."
              className="h-9 w-[230px] rounded bg-muted pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
            />
          </Form>

          <div className="ml-auto flex h-full items-center gap-1">
            {/* ไอคอนสลับด้วย CSS ตาม class "dark" บน <html> จึงตรงกับธีมตั้งแต่แรกโดยไม่ต้องรอ hydrate */}
            <HeaderIconButton label="สลับโหมดมืด/สว่าง" onClick={toggleTheme}>
              <Moon className="size-[18px] dark:hidden" />
              <Sun className="hidden size-[18px] dark:block" />
            </HeaderIconButton>

            {headerEnd}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
