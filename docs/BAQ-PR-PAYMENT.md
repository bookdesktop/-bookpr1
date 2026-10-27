# BAQ spec: `zPRPayment` — ยอดชำระเงินที่ผูกกับ PR

ใช้กับหน้า **KPI รายเดือน** (`/kpi`) เพื่อสรุปว่า PR แต่ละใบ **จ่ายเงินจริงไปเท่าไหร่ในเดือนไหน**

- ชื่อ BAQ: `zPRPayment` (เปลี่ยนได้ด้วย env `EPICOR_BAQ_PR_PAYMENT`)
- ประเภท: Shared, Updatable = ไม่ต้อง
- ผลลัพธ์: **1 แถว = การจ่ายเงิน 1 รายการ × บรรทัดใบแจ้งหนี้ 1 บรรทัด × บรรทัด PR 1 บรรทัด**
- BAQ ส่ง **ข้อมูลดิบเท่านั้น** ไม่มี Calculated field — เว็บคำนวณการเฉลี่ยยอดเอง (ดูหัวข้อ "วิธีคำนวณ")

> **สถานะ:** สร้างใน Epicor แล้ว (company 164958) เมื่อ 27 ต.ค. 2026 ผ่าน REST `Ice.BO.BAQDesignerSvc/Update`
> ทดสอบแล้ว: ไม่มีแถวซ้ำ และยอด KPI ไม่เกินยอดจ่ายจริงของใบแจ้งหนี้ชุดเดียวกัน (ส.ค.–ต.ค. 2026)

---

## 1. เส้นทางข้อมูล

```
APTran (การจ่ายเงิน, TranDate = วันที่จ่ายจริง)
  └─▶ APInvHed (ใบแจ้งหนี้)
        └─▶ APInvDtl (บรรทัดใบแจ้งหนี้, มี PONum/POLine)
              └─▶ ReqDetail (บรรทัด PR, มี PONUM/POLine)
                    └─▶ ReqHead (หัว PR)
  APInvHed ─▶ Vendor (ชื่อผู้ขาย)
```

## 2. ตารางและการ join

ทุก join เป็น **inner join** และต้องมี `Company = Company` ทุกคู่

| # | จาก | ไป | เงื่อนไข |
|---|---|---|---|
| 1 | `Erp.APTran` | `Erp.APInvHed` | `VendorNum = VendorNum` และ `InvoiceNum = InvoiceNum` |
| 2 | `Erp.APInvHed` | `Erp.APInvDtl` | `VendorNum = VendorNum` และ `InvoiceNum = InvoiceNum` |
| 3 | `Erp.APInvDtl` | `Erp.ReqDetail` | `APInvDtl.PONum = ReqDetail.PONUM` และ `APInvDtl.POLine = ReqDetail.POLine` |
| 4 | `Erp.ReqDetail` | `Erp.ReqHead` | `ReqNum = ReqNum` |
| 5 | `Erp.APInvHed` | `Erp.Vendor` | `VendorNum = VendorNum` |

## 3. เงื่อนไข (Table Criteria)

ตั้งที่ตาราง `APTran`:

| ฟิลด์ | เงื่อนไข | เหตุผล |
|---|---|---|
| `TranType` | `= 'Pay'` | เอาเฉพาะรายการจ่ายเงิน |
| `Posted` | `= true` | ไม่นับรายการที่ยังไม่ post |
| `Voided` | `= false` | ไม่นับเช็ค/การจ่ายที่ยกเลิก |

ตั้งที่ตาราง `APInvDtl`:

| ฟิลด์ | เงื่อนไข |
|---|---|
| `PONum` | `> 0` |

**ไม่ต้อง**ใส่เงื่อนไขวันที่ใน BAQ — เว็บกรองเดือนด้วย `$filter` บน `APTran_TranDate`

## 4. Display Fields (ต้องสะกดตรงตามนี้)

ชื่อคอลัมน์ที่ REST API ส่งออกมาจะเป็น `ตาราง_ฟิลด์` เว็บอ่านตามชื่อเหล่านี้

| ตาราง | ฟิลด์ | ชื่อใน REST | ใช้ทำอะไร |
|---|---|---|---|
| ReqHead | `RequestorID` | `ReqHead_RequestorID` | ผู้ขอ |
| ReqDetail | `ReqNum` | `ReqDetail_ReqNum` | เลขที่ PR |
| ReqDetail | `ReqLine` | `ReqDetail_ReqLine` | บรรทัด PR |
| ReqDetail | `ReqDate` | `ReqDetail_ReqDate` | วันที่ขอ |
| ReqDetail | `OrderQty` | `ReqDetail_OrderQty` | จำนวนที่ขอ |
| ReqDetail | `UnitCost` | `ReqDetail_UnitCost` | ราคาต่อหน่วย (สกุลเงินหลัก) |
| ReqDetail | `CostPerCode` | `ReqDetail_CostPerCode` | หน่วยราคา: E = ต่อชิ้น, C = ต่อ 100, M = ต่อ 1000 |
| ReqDetail | `PONUM` | `ReqDetail_PONUM` | เลขที่ PO |
| ReqDetail | `POLine` | `ReqDetail_POLine` | บรรทัด PO |
| APInvDtl | `InvoiceNum` | `APInvDtl_InvoiceNum` | เลขที่ใบแจ้งหนี้ |
| APInvDtl | `InvoiceLine` | `APInvDtl_InvoiceLine` | บรรทัดใบแจ้งหนี้ |
| APInvDtl | `ExtCost` | `APInvDtl_ExtCost` | ยอดบรรทัด (สกุลเงินหลัก) |
| APInvDtl | `TotalTax` | `APInvDtl_TotalTax` | ภาษีของบรรทัด |
| APInvHed | `VendorNum` | `APInvHed_VendorNum` | รหัสผู้ขาย |
| APInvHed | `InvoiceAmt` | `APInvHed_InvoiceAmt` | ยอดรวมใบแจ้งหนี้ (สกุลเงินหลัก) |
| Vendor | `Name` | `Vendor_Name` | ชื่อผู้ขาย |
| APTran | `HeadNum` | `APTran_HeadNum` | เลขที่รายการจ่าย |
| APTran | `CheckNum` | `APTran_CheckNum` | เลขที่เช็ค |
| APTran | `TranDate` | `APTran_TranDate` | **วันที่จ่ายจริง** (ใช้แบ่งเดือน) |
| APTran | `TranAmt` | `APTran_TranAmt` | ยอดที่ตัดหนี้ใบนี้ (สกุลเงินหลัก) |
| APTran | `WithholdAmt` | `APTran_WithholdAmt` | ภาษีหัก ณ ที่จ่าย |

> ใช้ฟิลด์สกุลเงินหลัก (THB) ทั้งหมด — **ห้ามใช้** ฟิลด์ที่ขึ้นต้นด้วย `Doc...` เพราะระบบมีทั้ง THB และ USD
>
> `ReqDetail.ExtCost` ที่เห็นใน REST ของ `Erp.BO.ReqSvc` **ไม่มีในฐานข้อมูล** (BO คำนวณให้) จึงใช้ใน BAQ ไม่ได้
> เว็บคำนวณเองเป็น `OrderQty × UnitCost ÷ (100 ถ้า C, 1000 ถ้า M, ไม่งั้น 1)` — ตรงกับค่าของ BO 300/300 แถวที่ทดสอบ

## 5. วิธีคำนวณ (ทำในเว็บ: `src/lib/kpi.ts`)

ใบแจ้งหนี้ 1 ใบจ่ายครั้งเดียว แต่มีหลายบรรทัด (หลาย PO / หลาย PR) จึงต้องแบ่งยอดจ่ายลงแต่ละบรรทัด

1. **ส่วนของบรรทัดใบแจ้งหนี้**
   `ยอดจ่ายของบรรทัด = TranAmt × (APInvDtl.ExtCost + APInvDtl.TotalTax) ÷ max(InvoiceAmt, ผลรวมบรรทัดที่ผูก PO)`
   - ใบที่มีค่าใช้จ่ายอื่นไม่ผูก PO (ค่าขนส่ง ฯลฯ) → ตัวหารคือ `InvoiceAmt` ส่วนนั้นไม่ถูกนับเข้า PR
   - ใบที่มี**บรรทัดติดลบไม่ผูก PO** (เช่นหักเงินมัดจำ) → ตัวหารคือผลรวมบรรทัด PO ยอดที่แบ่งจึงไม่เกินยอดที่จ่ายจริง
     (พบจริง เช่นใบ `IV6909-070`: บรรทัด PO 305,325 แต่ยอดใบ 157,825)
2. **ถ้า PO บรรทัดเดียวมาจากหลาย PR** แบ่งต่อตามมูลค่า PR line (`OrderQty × UnitCost`)
3. รวมตาม `ReqDetail_ReqNum` ในเดือนที่ `APTran_TranDate` ตก
4. ภาษีหัก ณ ที่จ่ายแบ่งด้วยสัดส่วนเดียวกัน — **เงินที่ออกจริง = ยอดชำระ − ภาษีหัก ณ ที่จ่าย**

### ข้อจำกัดที่ควรรู้

- ค่าใช้จ่ายเพิ่มเติมระดับหัวใบแจ้งหนี้ (misc charge ที่ไม่ผูก PO) **ไม่ถูกนับ**เข้า PR
- ใบแจ้งหนี้ที่ไม่ได้อ้างอิง PO (ไม่มี `PONum`) หรือ PO ที่ไม่ได้มาจาก PR **ไม่อยู่ใน KPI นี้**
- ถ้า `InvoiceAmt = 0` (เช่น credit memo ที่หักลบกัน) บรรทัดนั้นจะถูกข้าม
- เงินมัดจำที่จ่ายผ่านใบแจ้งหนี้แยก (ไม่ผูก PO line) จะไม่ถูกนับเป็นยอดชำระของ PR

## 6. หมายเหตุการสร้างผ่าน API

- `ParseFromSQL` ใช้ไม่ได้ เพราะ feature flag `EnableSQLToBAQCreation` ปิดอยู่ (ไม่ได้เปิด)
- Calculated field ที่ส่งผ่าน `Update` ถูก**ข้ามโดยไม่แจ้ง error** (บัญชี API น่าจะไม่มีสิทธิ์) จึงเลี่ยงไปใช้ฟิลด์ดิบแทน
- `DisplayPhrase` (ข้อความ SQL ใน BAQ Designer) ยังว่าง จะถูกสร้างเมื่อเปิดแล้วกด Save ใน BAQ Designer ครั้งแรก

## 7. ทดสอบหลังสร้าง BAQ

1. ใน BAQ Designer กด **Analyze → Get List** ต้องได้ข้อมูล และคอลัมน์ตามข้อ 4
2. เปิด `/api/baq/zPRPayment?$top=5` ในเว็บ ต้องได้ JSON ที่มีคีย์ตามข้อ 4
3. เปิดหน้า `/kpi` เลือกเดือนที่รู้ยอดจ่ายอยู่แล้ว แล้วเทียบกับรายงาน AP Payment ใน Epicor
