# Design System — Epicor Web

แนวทาง UI ของโปรเจกต์นี้ อ้างอิงภาษาภาพ (visual language) จาก
[Velzon — Minimal layout](https://themesbrand.com/velzon/html/minimal/index.html)
แล้วแปลงให้ใช้กับ stack ของเรา: **Next.js + Tailwind CSS v4 + shadcn tokens** (`src/app/globals.css`)

> Velzon เป็น template เชิงพาณิชย์ เราใช้เป็นแนวทางด้านสี ระยะ และรูปแบบ component เท่านั้น
> **ห้ามคัดลอกไฟล์ CSS, ฟอนต์, รูป หรือไอคอนของ Velzon มาใส่ในโปรเจกต์** ให้เขียนด้วย Tailwind เอง

ค่าทั้งหมดในเอกสารนี้ดึงมาจาก `bootstrap.min.css` / `app.min.css` ของหน้า demo (ตุลาคม 2026)
ค่าที่ไม่มีในต้นฉบับและเราปรับเอง จะระบุว่า _(ปรับเอง)_

---

## 1. หลักการของ Minimal layout

1. **พื้นหลังขาว ไม่มีเงา** — แยกส่วนด้วยเส้นขอบบาง `1px` สีเทาอ่อน แทน shadow
2. **Sidebar สีเทาอ่อนมาก** (`#f6f8fa`) ตัดกับพื้นที่เนื้อหาสีขาว
3. **สีหลักสีเดียว** (ฟ้า `#25a0e2`) ใช้กับลิงก์ เมนูที่เลือก ปุ่มหลัก
4. **สถานะใช้ badge แบบ soft** — พื้นสีอ่อน + ตัวอักษรสีเข้มของสีเดียวกัน ไม่ใช้สีทึบ
5. **ตัวอักษรเล็กและแน่น** — ขนาดฐาน `14px` เหมาะกับหน้าจอข้อมูลจำนวนมาก (ตาราง PR, BAQ)

---

## 2. สี (Color tokens)

### 2.1 สีหลักและสีสถานะ

| Token | Light | Soft bg (light) | ใช้กับ |
|---|---|---|---|
| `primary` | `#25a0e2` | `#def1fb` | ลิงก์, ปุ่มหลัก, เมนูที่เลือก, focus ring |
| `secondary` | `#878a99` | — | ข้อความรอง, ไอคอน, ปุ่ม ghost |
| `success` | `#00bd9d` | `#d9f5f0` | อนุมัติแล้ว, Open, ตัวเลขเพิ่มขึ้น |
| `info` | `#32ccff` | `#e0f7ff` | รอดำเนินการ, ข้อมูลทั่วไป |
| `warning` | `#ffbc0a` | `#fff5da` | รออนุมัติ, ใกล้ครบกำหนด |
| `danger` | `#f06548` | `#fde8e4` | ปฏิเสธ, error, ตัวเลขลดลง |
| `dark` | `#343a40` | — | — |

ใน dark mode สี soft bg ใช้สูตร `rgba(<สี>, 0.15)` เช่น primary → `rgba(37,160,226,0.15)`

### 2.2 พื้นผิวและตัวอักษร

| บทบาท | Light | Dark | shadcn token |
|---|---|---|---|
| พื้นหลังหน้า | `#ffffff` | `#1a1d21` | `--background` |
| พื้น card / header | `#ffffff` | `#212529` | `--card` |
| พื้นรอง (thead, hover, input) | `#f3f6f9` | `#282b2e` | `--muted` |
| พื้น tertiary (เส้นขอบ, divider) | `#e9ebec` | `#2a2d31` | `--secondary` |
| เส้นขอบ | `#e9ebec` | `#32383e` | `--border`, `--input` |
| ตัวอักษรหลัก | `#212529` | `#ced4da` | `--foreground` |
| หัวข้อ (heading) | `#495057` | `#ced4da` | ใช้ `text-foreground/85` หรือ token เพิ่ม |
| ตัวอักษรรอง (muted) | `#878a99` | `#878a99` | `--muted-foreground` |

### 2.3 Sidebar และ Header

| บทบาท | Light | Dark _(ปรับเอง)_ | shadcn token |
|---|---|---|---|
| พื้น sidebar | `#f6f8fa` | `#212529` | `--sidebar` |
| เส้นขอบ sidebar | `#e9ebec` | `#32383e` | `--sidebar-border` |
| ตัวอักษรเมนู | `#6d7080` | `#a3a6b7` | `--sidebar-foreground` |
| เมนู hover / active | `#25a0e2` | `#25a0e2` | `--sidebar-primary` |
| พื้นเมนู active | `rgba(37,160,226,0.15)` | `rgba(37,160,226,0.15)` | `--sidebar-accent` |
| หัวข้อกลุ่มเมนู | `#919da9` | `#878a99` | ใช้ `text-sidebar-foreground/70` |
| พื้น header | `#ffffff` | `#212529` | `--background` / `--card` |
| ปุ่มใน header (hover) | `rgba(135,138,153,0.12)` | เดียวกัน | ใช้ `hover:bg-secondary-foreground/10` |
| พื้นช่องค้นหาใน header | `#f3f3f9` | `#282b2e` | `--muted` |

### 2.4 นำไปใส่ `src/app/globals.css`

แทนที่ค่าใน `:root` และ `.dark` เดิม (โครงสร้าง token ของ shadcn ยังเหมือนเดิม เปลี่ยนแค่ค่าสี)

```css
:root {
  --radius: 0.25rem;

  --background: #ffffff;
  --foreground: #212529;
  --card: #ffffff;
  --card-foreground: #212529;
  --popover: #ffffff;
  --popover-foreground: #212529;

  --primary: #25a0e2;
  --primary-foreground: #ffffff;
  --secondary: #e9ebec;
  --secondary-foreground: #495057;
  --muted: #f3f6f9;
  --muted-foreground: #878a99;
  --accent: #def1fb;
  --accent-foreground: #25a0e2;
  --destructive: #f06548;

  --border: #e9ebec;
  --input: #e9ebec;
  --ring: #25a0e2;

  /* สีสถานะเพิ่มเติม (ไม่มีใน shadcn เดิม) */
  --success: #00bd9d;
  --success-soft: #d9f5f0;
  --info: #32ccff;
  --info-soft: #e0f7ff;
  --warning: #ffbc0a;
  --warning-soft: #fff5da;
  --danger-soft: #fde8e4;
  --primary-soft: #def1fb;

  --sidebar: #f6f8fa;
  --sidebar-foreground: #6d7080;
  --sidebar-primary: #25a0e2;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgb(37 160 226 / 0.15);
  --sidebar-accent-foreground: #25a0e2;
  --sidebar-border: #e9ebec;
  --sidebar-ring: #25a0e2;
}

.dark {
  --background: #1a1d21;
  --foreground: #ced4da;
  --card: #212529;
  --card-foreground: #ced4da;
  --popover: #212529;
  --popover-foreground: #ced4da;

  --primary: #25a0e2;
  --primary-foreground: #ffffff;
  --secondary: #2a2d31;
  --secondary-foreground: #ced4da;
  --muted: #282b2e;
  --muted-foreground: #878a99;
  --accent: rgb(37 160 226 / 0.15);
  --accent-foreground: #25a0e2;
  --destructive: #f06548;

  --border: #32383e;
  --input: #32383e;
  --ring: #25a0e2;

  --success-soft: rgb(0 189 157 / 0.15);
  --info-soft: rgb(50 204 255 / 0.15);
  --warning-soft: rgb(255 188 10 / 0.15);
  --danger-soft: rgb(240 101 72 / 0.15);
  --primary-soft: rgb(37 160 226 / 0.15);

  --sidebar: #212529;
  --sidebar-foreground: #a3a6b7;
  --sidebar-accent: rgb(37 160 226 / 0.15);
  --sidebar-accent-foreground: #25a0e2;
  --sidebar-border: #32383e;
}
```

และเพิ่มใน `@theme inline` เพื่อให้ใช้เป็น class ได้ (`bg-success-soft`, `text-success` ฯลฯ):

```css
@theme inline {
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-danger-soft: var(--danger-soft);
  --color-primary-soft: var(--primary-soft);
}
```

---

## 3. ตัวอักษร (Typography)

| | ค่าของ Velzon | ของเรา |
|---|---|---|
| Font | `"Open Sans", sans-serif` (ทั้ง body และ heading) | **Open Sans + IBM Plex Sans Thai** _(ปรับเอง)_ |
| ขนาดฐาน | `0.875rem` (14px) | `text-sm` |
| น้ำหนัก heading | `600` | `font-semibold` |
| line-height heading | `1.2` | `leading-tight` |

**ทำไมต้องเพิ่มฟอนต์ไทย:** Open Sans ไม่มีตัวอักษรไทย ถ้าใช้อย่างเดียว ข้อความไทยจะ fallback ไปฟอนต์ระบบซึ่งหน้าตาไม่เข้ากัน
ให้โหลดทั้งสองผ่าน `next/font/google` ใน `src/app/layout.tsx` แล้วตั้ง `--font-sans: var(--font-open-sans), var(--font-plex-thai), sans-serif`

### ขนาดที่ใช้ซ้ำ

| ใช้กับ | ขนาด | Tailwind |
|---|---|---|
| Page title (แถบหัวหน้า) | 15px, ตัวพิมพ์ใหญ่, `700` | `text-[15px] font-bold uppercase` |
| Card title | 16px, `600` | `text-base font-semibold` |
| ตัวเลข KPI | 22px, `600` | `text-[22px] font-semibold` |
| ทักทาย / หัวข้อ section | 16px | `text-base` |
| เนื้อหา, ตาราง | 14px | `text-sm` |
| เมนู sidebar | 15px | `text-[15px]` |
| หัวข้อกลุ่มเมนู | 11px, ตัวพิมพ์ใหญ่, `600`, letter-spacing `.05em` | `text-[11px] font-semibold uppercase tracking-wider` |
| ข้อความเล็ก / label KPI | 12–13px | `text-xs` / `text-[13px]` |

---

## 4. Layout

```
┌────────────┬──────────────────────────────────────────────┐
│ Brand 70px │ Header 70px (ขาว, border-bottom)              │
├────────────┼──────────────────────────────────────────────┤
│            │ Page title box (ชื่อหน้า + breadcrumb)          │
│  Sidebar   ├──────────────────────────────────────────────┤
│  250px     │ Page content (padding 24px)                   │
│  #f6f8fa   │   ┌ card ┐ ┌ card ┐ ┌ card ┐ ┌ card ┐  ← KPI    │
│            │   ┌──────── card: ตาราง ───────────┐          │
│            │                                               │
│            ├──────────────────────────────────────────────┤
│            │ Footer 60px (#f6f8fa, ข้อความสีเทา)            │
└────────────┴──────────────────────────────────────────────┘
```

| ส่วน | ค่าของ Velzon | Tailwind |
|---|---|---|
| ความกว้าง sidebar | `250px` (md: `180px`, ย่อ: `70px`) | `w-[250px]` |
| ความสูง header | `70px` | `h-[70px]` |
| padding แนวนอนของ header | `1.5rem` | `px-6` |
| padding ของ page content | `1.5rem` (24px) | `p-6` |
| ระยะห่างระหว่าง card | `1.5rem` | `gap-6` |
| ความสูง footer | `60px` | `h-[60px]` |
| Breakpoint ซ่อน sidebar | `< 992px` (Bootstrap `lg`) | ใช้ `lg:` แทน `md:` |

### Page title box

แถบขาวใต้ header มีเส้นขอบล่าง แสดงชื่อหน้า (ซ้าย) และ breadcrumb (ขวา)

```tsx
<div className="flex items-center justify-between border-b bg-card px-6 py-2.5">
  <h4 className="text-[15px] font-bold uppercase">Purchase Requisition</h4>
  <nav className="text-sm text-muted-foreground">หน้าหลัก / <span className="text-foreground">PR</span></nav>
</div>
```

---

## 5. Components

### 5.1 Sidebar menu

- พื้น `bg-sidebar`, เส้นขอบขวา `border-r border-sidebar-border`
- Brand อยู่บนสุด สูง 70px เท่ากับ header
- หัวข้อกลุ่ม ("MENU", "EPICOR") ใช้สไตล์ menu title ด้านบน, `px-6 pt-5 pb-2`
- รายการเมนู: `flex items-center gap-3 px-6 py-2.5 text-[15px] text-sidebar-foreground`
  - hover: `hover:text-sidebar-primary`
  - active: `bg-sidebar-accent text-sidebar-accent-foreground font-medium`
- ไอคอนขนาด `18px` (`size-[18px]`) ใช้ `lucide-react`

### 5.2 Header (topbar)

- `sticky top-0 h-[70px] border-b bg-card px-6`
- ปุ่มไอคอนเป็นวงกลม ghost: `size-10 rounded-full text-secondary-foreground hover:bg-secondary-foreground/10`
- ช่องค้นหา (ถ้ามี): `h-9 rounded bg-muted pl-9 border-0`, ไอคอนแว่นขยายอยู่ด้านซ้าย
- ด้านขวาสุด: badge รหัสบริษัท / ข้อมูลผู้ใช้ พื้น `bg-muted`

### 5.3 Card

Velzon Minimal: **ไม่มีเงา มีเส้นขอบ 1px** มุมโค้ง `0.25rem`

```tsx
<section className="rounded border bg-card">
  <header className="flex items-center border-b px-4 py-3">
    <h4 className="flex-1 text-base font-semibold">รายการ PR ล่าสุด</h4>
    {/* ปุ่ม action ด้านขวา (เช่น btn-soft-primary btn-sm) */}
  </header>
  <div className="p-4">…</div>
</section>
```

- padding ใน card: `1rem` (`p-4`)
- card แบบเส้นประ (ใช้กับ empty state / ข้อความแนะนำ): `border border-dashed`

### 5.4 KPI / Stat card

ใช้บนหน้าหลัก เช่น "PR ที่รออนุมัติ", "PR เดือนนี้"

```
┌──────────────────────────────────────┐
│ PR ที่ยังเปิดอยู่            +12.5% ↑ │  ← label: text-xs uppercase text-muted-foreground
│                                      │     % เปลี่ยนแปลง: text-success / text-danger
│ 128                          [icon]  │  ← ตัวเลข: text-[22px] font-semibold
│ ดูทั้งหมด                             │  ← ลิงก์: text-primary underline
└──────────────────────────────────────┘     icon: กล่อง 48px rounded bg-primary-soft text-primary
```

- hover ยกขึ้นเล็กน้อย (Velzon `card-animate`): `transition hover:-translate-y-1`
- แสดงเป็นกริด 4 คอลัมน์บนจอใหญ่: `grid gap-6 sm:grid-cols-2 xl:grid-cols-4`

### 5.5 Table

ใช้กับ `BaqTable` (`src/components/baq-table.tsx`)

| ส่วน | Velzon | Tailwind |
|---|---|---|
| thead | `table-light text-muted` | `bg-muted text-muted-foreground` |
| padding เซลล์ | `.75rem .6rem` | `px-2.5 py-3` |
| เส้นแบ่งแถว | `border-bottom 1px #e9ebec` | `border-b` |
| hover แถว | `table-hover` | `hover:bg-muted/60` |
| จัดแนว | `align-middle table-nowrap` | `align-middle whitespace-nowrap` |
| ตัวเลข | — | `text-right tabular-nums` |

- คอลัมน์รหัส/เลขที่ (เช่น เลขที่ PR) เป็นลิงก์: `font-medium text-primary hover:underline`
- ตารางอยู่ใน card โดยไม่มีเส้นขอบซ้ำ — ใส่ `overflow-x-auto` ที่ตัวห่อ

### 5.6 Badge (สถานะ)

ใช้แบบ **soft** เป็นหลัก

```tsx
<span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-success-soft text-success">อนุมัติ</span>
```

| สถานะ PR (Epicor) | สี |
|---|---|
| Open / อนุมัติแล้ว | `success` |
| รออนุมัติ (มี `CurrDispatcherID`) | `warning` |
| ส่งต่อ / ดำเนินการ | `info` |
| ปฏิเสธ / ยกเลิก | `danger` |
| ปิดแล้ว (`OpenReq = false`) | `secondary` → `bg-muted text-muted-foreground` |

### 5.7 Button

| ประเภท | ใช้เมื่อ | Tailwind |
|---|---|---|
| Primary | action หลักของหน้า (ค้นหา, บันทึก) | `bg-primary text-primary-foreground hover:bg-primary/90` |
| Soft | action รองใน card header | `bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground` |
| Ghost icon | ปุ่มไอคอนใน header / แถวตาราง | `rounded-full text-secondary-foreground hover:bg-secondary-foreground/10` |
| Outline | ตัวกรอง, แบ่งหน้า | `border bg-card hover:bg-muted` |

ขนาด (จาก Velzon): ปกติ `px-[0.9rem] py-2 text-sm`, เล็ก `px-2 py-1 text-xs`, มุมโค้ง `rounded` (0.25rem)
ไม่มีเงาทุกปุ่ม

### 5.8 Form

- input / select: `h-9 rounded border bg-card px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20`
- label: `text-sm font-medium mb-1.5`
- ฟอร์มค้นหาเหนือตาราง วางในแถวเดียว: `flex flex-wrap gap-2`

### 5.9 สถานะการโหลด / error / ว่าง

| สถานะ | รูปแบบ |
|---|---|
| Loading | skeleton แถบเทา `animate-pulse bg-muted rounded` ขนาดเท่าแถวตาราง |
| Error | กล่อง `rounded border border-destructive/30 bg-danger-soft text-destructive p-4` |
| ว่าง | card เส้นประ ข้อความกลาง `text-muted-foreground` |

---

## 6. ระยะ มุม และเงา

| | ค่า |
|---|---|
| มุมโค้งปกติ | `0.25rem` → `rounded` |
| มุมโค้งเล็ก | `0.2rem` → `rounded-sm` |
| มุมโค้งใหญ่ | `0.3rem` → `rounded-md` |
| มุมโค้งพิเศษ (avatar, ปุ่มไอคอน) | `rounded-full` |
| เงา | **ไม่ใช้** (Minimal) ยกเว้น dropdown: `0 2px 4px rgba(15,34,58,.12)` |
| Grid gutter | `1.5rem` → `gap-6` |

---

## 7. สิ่งที่ต้องปรับในโค้ดปัจจุบัน

| ไฟล์ | ปรับอะไร |
|---|---|
| `src/app/globals.css` | ใส่ค่าสีตามข้อ 2.4 |
| `src/app/layout.tsx` | เปลี่ยนฟอนต์เป็น Open Sans + IBM Plex Sans Thai (ข้อ 3) |
| `src/components/app-shell.tsx` | sidebar 250px, header 70px, เพิ่มหัวข้อกลุ่มเมนู, breakpoint `lg:` (ข้อ 4, 5.1, 5.2) |
| `src/components/baq-table.tsx` | thead `bg-muted text-muted-foreground`, padding `px-2.5 py-3` (ข้อ 5.5) |
| `src/app/pr/page.tsx` | เพิ่ม page title box, ห่อตารางด้วย card, แสดงสถานะเป็น badge (ข้อ 4, 5.3, 5.6) |
| `src/app/page.tsx` | เปลี่ยนเป็น dashboard มี KPI card (ข้อ 5.4) |
