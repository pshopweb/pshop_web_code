# PShop — Latest Fixes (Date, COD, Coupon)

Aapne 3 problem batayi thi. Teeno fix ho gayi hain.

---

## ✅ Aapka backend abhi live hai

Maine aapka URL test kiya — **`setupDemoStore()` chal chuka hai**:

| Sheet | Rows |
|---|---|
| Products | 48 |
| Reviews | 48 |
| Notifications | 24 |
| Orders / Payments / Delivery | 12 each |
| Users | 7 |
| Wishlist | 6 |
| Coupons | 5 |
| Cart | 3 |
| **TOTAL** | **199 rows** |

Login bhi kaam kar raha hai (`demo@pshop.in`, `admin@pshop.in`). ✅

---

## 🐛 PROBLEM 1 — Google Sheet me date nahi jaa rahi thi

### Kya ho raha tha

Google Sheets **ISO date strings ko apne aap `Date` object bana leta hai**.
Jab data wapas padha jata tha, format bigad chuka hota tha:

```
Sheet me likha  : 2026-07-25T08:24:31.977Z
Wapas mila      : Sat Jul 25 2026 08:24:31 GMT+0000   ← Date object!

Frontend code   : String(placedAt).slice(0, 10)
Milta tha       : "Sat Jul 25"     ❌
Chahiye tha     : "2026-07-25"     ✅
```

Iski wajah se **admin dashboard ka revenue chart khaali** dikhta tha,
aur date filters kaam nahi karte the.

### Kya fix kiya

**Backend (`PShop-Complete.gs`) — 5 jagah:**

1. **`parseCell()`** — Sheet se aane wale har `Date` object ko turant ISO
   string bana deta hai. Ye sabse important fix hai — poore backend me
   ek hi jagah se sab theek ho gaya.

2. **`objectToRow()`** — Sheet me likhte waqt bhi `Date` ko ISO text banata
   hai, taaki locale format (25/07/2026) me save na ho.

3. **`toISO(v)`** — naya helper. Date object, string, ya khaali — teeno
   safe handle karta hai.

4. **`toDateKey(v)`** — naya helper. `YYYY-MM-DD` deta hai (charts ke liye).
   UTC parts use karta hai taaki timezone se din na khisak jaye.

5. **`forceTextOnDateColumns()`** — naya. Setup ke waqt saare date columns
   ko **"Plain text" format** de deta hai, taaki Sheets unhe touch hi na kare.
   16 date columns cover hote hain: `createdAt`, `placedAt`, `expiresAt`, etc.

**Frontend — 3 files:**

- **`utils.js`** — naya `dateKey()` helper export hota hai
- **`admin/dashboard.js`** — `String(o.placedAt).slice(0,10)` → `dateKey(o.placedAt)`
- **`admin/reports.js`** — wahi fix

### Verify kiya

Live Sheet se test:

```
placedAt     = 2026-07-25T08:10:47.776Z    OK
expectedAt   = 2026-07-29T08:10:47.776Z    OK
slice(0,10)  = '2026-07-25'                OK — chart kaam karega
timeline     = 6 steps, dates OK
```

---

## 🐛 PROBLEM 2 — Cash on Delivery

### Kya kami thi

COD ka data to tha, par **backend check hi nahi karta tha**. Koi seedha API
call karke COD-blocked item ka COD order bhej sakta tha. Aur COD fee client
ke bheje totals par depend thi — jo trust nahi karni chahiye.

### Kya add kiya

**1. Server-side COD validation** — `placeOrder()` me:

```
"Pulsewave Wireless Earbuds Edge" par Cash on Delivery available nahi hai.
Please choose UPI or Card payment.
```

Product ka **naam** bhi batata hai, taaki user samajh sake kaunsa item hatana hai.

**2. COD fee ab server par judti hai** — client ke totals par bharosa nahi:

```javascript
if (isCod) {
  totals.codFee = CONFIG.COD_FEE;      // ₹29
  totals.total  = baseTotal + CONFIG.COD_FEE;
} else {
  totals.codFee = 0;
}
```

**3. Naya endpoint `checkCod`** — checkout page pehle hi pooch sakta hai:

```json
{
  "eligible": false,
  "blockedItems": ["Pulsewave Wireless Earbuds Edge"],
  "codFee": 29,
  "reason": "1 item(s) par COD available nahi hai"
}
```

**4. Frontend ab naam dikhata hai** — pehle sirf "one or more items" likha
aata tha. Ab exact list:

> ⚠️ **Cash on Delivery available nahi hai** in items par:
> - Pulsewave Wireless Earbuds Edge
>
> In items ko cart se hatakar COD use kar sakte hain, ya UPI / Card se payment karein.

Aapke demo data me **48 me se 10 products** COD-blocked hain, to ye flow
turant test kar sakte hain.

---

## 🐛 PROBLEM 3 — "₹499 par 10% off" wali line

Aapne bilkul sahi pakda. Upar wali announcement bar **galat** thi:

```
❌ PEHLE:
Free delivery above ₹499 · Use code PSHOP10 for 10% off
```

Padhne me lagta tha ki ₹499 par 10% off milega. **Par asli rule ye hai:**

| Cheez | Rule |
|---|---|
| Free delivery | ₹499 se upar |
| PSHOP10 coupon | **₹999** se upar, 10% off, **max ₹300** |

Do alag-alag limits ek line me mix ho gayi thi.

```
✅ AB:
Free delivery above ₹499 · PSHOP10: 10% off above ₹999 (max ₹300)
```

Test se confirm kiya:

- ₹998 par coupon **block** hota hai
- ₹1000 par ₹100 discount (10%)
- ₹1,00,000 par bhi sirf ₹300 (max cap)

---

## 🧪 Testing

**182/182 pass** (pehle 149 the — 33 naye tests add kiye):

```bash
node tests/backend.test.js     # backend logic
python3 tests/live-check.py    # aapka live URL
```

Naye test sections:
- **DATE HANDLING** (14 tests) — Date object bug ko actually reproduce karke
- **CASH ON DELIVERY** (15 tests) — validation, fee, blocked items, UPI fallback
- **COUPON RULES** (4 tests) — announcement bar se match karta hai ya nahi

Testing me do purani assertions bhi galat nikli, wo bhi theek ki:
- Checkout test COD-blocked item ka COD order bhej raha tha (ab UPI use karta hai)
- Timeline test `=== 6` maan raha tha, par cancelled orders me 7 steps hote hain

---

## 👉 Ab aapko kya karna hai

Ye fixes live karne ke liye:

| # | Kahan | Kya |
|---|---|---|
| 1 | Apps Script | `backend/PShop-Complete.gs` **dobara paste** karein (purana code delete karke) |
| 2 | Apps Script | Deploy → Manage deployments → ✏️ → **New version** → Deploy |

> ⚠️ `setupDemoStore()` **dobara chalane ki zaroorat nahi** — aapka data
> already bhara hua hai. Sirf code update karna hai.

**Agar date columns ko plain-text format bhi chahiye** (recommended, taaki
aage kabhi problem na ho), to ek baar `setupDatabase()` run kar dein —
ye existing data ko chhuta nahi, sirf column format set karta hai.

Deploy ke baad check karein:

```bash
python3 tests/live-check.py
```

`checkCod` endpoint tab kaam karne lagega (abhi 404 deta hai kyunki purana
version deployed hai).
