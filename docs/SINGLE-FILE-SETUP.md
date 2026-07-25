# PShop — Single File Setup (Sabse Aasan Tarika)

Ab **17 files** paste karne ki zaroorat nahi. Sirf **1 file** hai:

```
backend/PShop-Complete.gs      ← bas ye ek file
```

Isme poora backend + demo data generator dono hain.

---

## Aapki current situation

Aapka backend **already live hai** ✅

| Cheez | Status |
|---|---|
| Web App URL | ✅ Chal raha hai (maine test kiya) |
| Google Sheet | ✅ `pshopdb` judi hui hai |
| Sheet ID | `1wTwksFgwT-cD79l3ccPsR5rvgNZDp3wAxeqI236eD2M` |
| POST requests | ✅ JSON de rahe hain |
| Error handling | ✅ Sahi kaam kar raha |
| **Data** | ❌ **Khaali hai — bas yahi karna baaki hai** |

Aapka URL `config.js` me **already daal diya** hai:

```
https://script.google.com/macros/s/AKfycbxoXbHd5wLLpSF0GppqGpqLVyU2yv547Lu4knDFNJbxgnwXuvTsOck8lsxIk7aWLONV/exec
```

Isiliye website khali dikh rahi hai. **Neeche wale 3 step** karne hain.

---

## STEP 1 — Purana code hatakar naya paste karein

1. Apni Sheet kholein → **Extensions → Apps Script**
2. Left sidebar me jitni bhi `.gs` files hain, **sab delete kar dein**
   (file ke naam par 3 dots ⋮ → Delete)
3. Sirf ek `Code.gs` rehne dein, uska saara code **select karke delete** karein
4. `backend/PShop-Complete.gs` ka **poora content** copy karke paste karein
5. **Ctrl + S** (save)

> File badi hai (~3,750 lines) — paste hone me 5-10 second lag sakte hain. Normal hai.

---

## STEP 2 — Demo store banayein ⭐

1. Upar function dropdown me **`setupDemoStore`** choose karein
2. **▶ Run** dabayein
3. Permission maange to: **Review permissions → apna account → Advanced →
   Go to ... (unsafe) → Allow**
4. 20–40 second lagenge. Execution log me ye dikhega:

```
🚀 PShop demo store setup shuru...
   Sheet: "pshopdb"
   Purana demo data saaf kiya.
   ✓ 4 users banaye
   ✓ 48 products banaye
   ✓ 6 orders banaye (payments + delivery ke saath)
   ✓ 28 reviews banaye
   ✓ Notifications aur support tickets banaye

✅ DEMO STORE READY! (18.4s)
─────────────────────────────────────────────
  Products      : 48
  Categories    : 8
  Users         : 4
  Orders        : 6
  Reviews       : 28
  Coupons       : 5
─────────────────────────────────────────────
```

---

## STEP 3 — Dobara deploy karein (ZAROORI)

Code badla hai, isliye naya version deploy karna hoga:

```
Deploy → Manage deployments → ✏️ (pencil)
   → Version: "New version" → Deploy
```

> ❗ Sirf save karne se live URL update **nahi** hota. URL wahi rahega, badlega nahi.

---

## STEP 4 — URL website me daalein

File: **`assets/js/core/config.js`** (line ~22)

```js
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbwbKk9p8E1e-pSY0YVkJYJ3JpH41DCFbLxBQGyufmt8Uu9uMx1CJEiSwtW8x_efUzKm/exec',
```

Save karein. **Ho gaya!** 🎉

---

## Check karein sab theek hai

Browser me ye URL kholein:

```
https://script.google.com/macros/s/AKfycbwbKk9p8E1e-pSY0YVkJYJ3JpH41DCFbLxBQGyufmt8Uu9uMx1CJEiSwtW8x_efUzKm/exec
```

Ab `"Products": 48` dikhna chahiye (pehle `0` tha):

```json
{
  "success": true,
  "data": {
    "spreadsheet": { "name": "pshopdb", "id": "1wTwks..." },
    "sheets": { "Users": 4, "Products": 48, "Orders": 6, ... }
  }
}
```

Ya phir website me **`connect-test.html`** kholkar Test connection dabayein.

---

## Demo Login Details

| Role | Email | Password | Kya dekh sakte hain |
|------|-------|----------|---------------------|
| **Admin** | `admin@pshop.in` | `admin123` | Pura admin panel, saare orders/users |
| **Customer** | `demo@pshop.in` | `demo123` | 3 orders, 2 addresses, cart + wishlist |
| Customer | `priya@pshop.in` | `priya123` | 3 orders, 2 addresses (Patna) |
| Customer | `rahul@pshop.in` | `rahul123` | 2 orders (Delhi) |
| Customer | `sneha@pshop.in` | `sneha123` | Return request wala order (Ahmedabad) |
| Customer | `imran@pshop.in` | `imran123` | Replacement request (Kolkata) |
| _Blocked_ | `blocked@pshop.in` | `blocked123` | Login nahi hoga — block feature test karne ko |

---

## Demo me kya-kya milega

**Koi bhi sheet khaali nahi rahegi** — har ek me demo rows hongi taaki aap
har column ka format dekh sakein.

| Sheet | Rows | Kya hai isme |
|---|---|---|
| **README** | 225 | ⭐ Poori guide — har sheet ke har column ka matlab |
| Products | 48 | 8 categories × 6 products, real prices aur ratings |
| Reviews | 48 | Verified purchase badges ke saath |
| Notifications | 24 | Offers aur order updates |
| **Orders** | **12** | **9 alag status** — har case cover |
| **Payments** | 12 | COD, UPI, Card — refunds bhi |
| **Delivery** | 12 | AWB tracking numbers |
| Categories | 8 | Electronics, Fashion, Home, Beauty, Sports, Grocery, Toys, Books |
| **Users** | **7** | 1 admin + 5 customers + 1 blocked (testing ke liye) |
| Wishlist | 6 | 3 users ke saved products |
| Newsletter | 6 | Subscribers (ek unsubscribed bhi) |
| Coupons | 5 | PSHOP10, FLAT200, NEWUSER, FREESHIP, BIGSAVE50 |
| Banners | 4 | Homepage slider |
| Cart | 3 | 2 users ke live cart |
| FAQs | 15 | 6 categories me |
| Settings | 10 | Delivery charge, GST wagairah |
| Messages | 2 | Ek open, ek closed support ticket |
| OTP | 2 | Format example (ek live, ek expired) |

### Orders me kaunse status milenge?

`Placed` · `Confirmed` · `Packed` · `Shipped` · `Out for Delivery` ·
`Delivered` · `Cancelled` · `Return requested` · `Replacement requested`

Kuch orders par **coupon bhi laga hua** hai (discount calculation test karne ke liye).

Har order ka **poora timeline** hai (Placed → Confirmed → Packed → Shipped →
Out for Delivery → Delivered), isliye tracking page turant kaam karega.

---

## Column ka matlab kahan dekhein? 📖

Aapne poocha tha ki "1 row me title kya de raha — id, name, email…". Iske liye
**do** cheezein banayi hain:

### 1. Column par hover karein (sabse aasan)

Har sheet ke heading par ek **note** laga hai. Column heading par maus le jaate
hi matlab dikh jayega:

```
┌─ password ──────────────────────────────────┐
│ password                                    │
│                                             │
│ SHA-256 hash. YAHAN KABHI PLAIN PASSWORD    │
│ MAT LIKHEIN                                 │
└─────────────────────────────────────────────┘
```

Kul **202 columns** documented hain — 17 sheets ke saare columns.

### 2. README sheet (sabse pehli tab)

Setup ke baad ek **README** naam ki sheet sabse pehle dikhegi. Usme table
format me sab likha hai:

| SHEET | COLUMN | MATLAB |
|---|---|---|
| **Users — Registered accounts** | | Website par jitne bhi log signup karte hain |
| | `id` | Unique user ID. Format: U0001, U0002… (khud banta hai) |
| | `name` | Poora naam — jaise "Priya Sharma" |
| | `email` | Email address (login ke liye). Duplicate nahi ho sakta |
| | `phone` | 10-digit mobile number, bina +91 ke |
| | `password` | SHA-256 hash. YAHAN KABHI PLAIN PASSWORD MAT LIKHEIN |
| | `role` | "customer" ya "admin" |
| **Products — Aapka catalogue** | | Website par jo saaman dikhta hai |
| | `price` | Bechne ka daam, sirf number. ₹ ya comma MAT lagayein |
| | `stock` | Kitne units bache. 0 = Out of Stock dikhega |
| | `images` | JSON array — ["assets/img/products/p001-1.svg"] |
| | `tags` | JSON array — featured / trending / bestseller / flash |
| | `status` | "active" = dikhega, "deleted" = chhup jayega |

…aur aise hi saari 17 sheets ke liye.

> README sheet delete kar sakte hain — website par koi asar nahi padega.

### Do zaroori rules

1. **JSON columns** (`images`, `tags`, `specs`, `colors`, `addresses`,
   `items`, `timeline`) me **valid JSON** hona chahiye — `[` ya `{` se shuru.
   Galat likha to plain text ban jayega.
2. **Price/stock** me sirf **number** — `₹1,499` nahi, sirf `1499`.

---

## Kuch aur useful functions

Function dropdown se choose karke Run karein:

| Function | Kya karta hai |
|----------|---------------|
| **`setupDemoStore`** | ⭐ Sab kuch banata hai (demo data ke saath) |
| `setupDatabase` | Sirf khaali tables banata hai (demo data nahi) |
| `whichSheet` | Batata hai kaunsi Sheet judi hai |
| `setSheetId` | Sheet ID save karta hai (alag project ho to) |
| `clearDemoData` | Sirf data hatata hai, tables rehne dete hain |
| `applyColumnNotes` | Column headings par matlab (hover note) lagata hai |
| `buildReadmeSheet` | README sheet dobara banata hai |
| `cleanupExpiredOtps` | Purane OTP saaf karta hai (daily trigger me lagayein) |

> `setupDemoStore` dobara chala sakte hain — duplicate nahi banega, purana
> demo data hatakar fresh bana dega.

---

## Asli products kaise daalein?

Demo data hata kar apne products daalne ho to:

1. Admin panel kholein → `admin/products.html`
2. `admin@pshop.in` se login karein
3. **Add product** button se form bharein

Ya seedha Google Sheet ke **Products** tab me rows add karein.

---

## Common problems

| Problem | Solution |
|---------|----------|
| Website khali dikh rahi hai | `setupDemoStore()` chalaya? Uske baad **naya version deploy** kiya? |
| `Products: 0` aa raha hai | Seed function nahi chala. STEP 2 dobara karein |
| Changes live nahi ho rahe | Deploy → Manage deployments → ✏️ → **New version** |
| `ReferenceError` aa raha hai | Purani `.gs` files delete karna bhool gaye. Sirf ek file honi chahiye |
| Login nahi ho raha | `setupDemoStore()` hi users banata hai. Pehle wo chalayein |
| Site slow hai | Normal hai — Apps Script pehli request par 2-3 sec leta hai |

---

## Live jaane se pehle

- [ ] `CONFIG.SALT` badal dein (`Utility` section me, file ke shuru me)
- [ ] Admin password `admin123` se change karein
- [ ] Demo customers (`demo@`, `priya@`, `rahul@`) delete kar dein
- [ ] `CONFIG.ADMIN_EMAIL` apni email par set karein
- [ ] Demo products hatakar apne products daalein

> ⚠️ **SALT users ban jaane ke baad mat badalna** — purane passwords fail ho jayenge.
