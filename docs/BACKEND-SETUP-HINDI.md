# PShop — Google Sheets + Apps Script Setup Guide

**Poori guide Hinglish me.** Ye follow karne ke baad aapki website ka data
Google Sheets me save hoga — bilkul free, bina kisi server ke.

Time lagega: **15–20 minute**.

---

## Kya-kya chahiye

- Ek Google account (Gmail)
- `PShop/backend/` folder ki 17 `.gs` files
- Bas. Koi paid hosting ya database nahi chahiye.

---

## STEP 1 — Google Sheet banayein

1. [sheets.new](https://sheets.new) kholein (ya Drive → New → Google Sheets)
2. Sheet ka naam upar-left me change karein: **`PShop Database`**
3. **Ab address bar se Sheet ID copy kar lein** — aage kaam aayegi:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz123456/edit#gid=0
                                       └──────────── ye hi SHEET_ID hai ─────────┘
```

`/d/` ke baad aur `/edit` se pehle wala lamba hissa hi Sheet ID hai.
Notepad me paste karke rakh lein.

> **Note:** Sheets ke andar tabs (Users, Products, etc.) aapko manually
> banane ki zaroorat **nahi** hai. Step 4 me ek function chalayenge jo
> saari 17 sheets headers ke saath khud bana dega.

---

## STEP 2 — Apps Script editor kholein

Usi sheet me:

```
Extensions  →  Apps Script
```

Ek naya tab khulega. Usme `Code.gs` naam ki ek default file hogi jisme
`function myFunction() {}` likha hoga. **Us saara code delete kar dein.**

---

## STEP 3 — Saari 17 files paste karein

Ye sabse important step hai. Apps Script me har file alag banani hai.

### 3a. Pehli file — Code.gs

- Jo `Code.gs` pehle se khuli hai, usme `PShop/backend/Code.gs` ka
  **poora content** copy-paste karein
- `Ctrl + S` (ya Cmd+S) dabakar save karein

### 3b. Baaki 16 files

Har file ke liye ye repeat karein:

1. Left sidebar me **Files** ke bagal me **`+`** icon dabayein
2. **Script** choose karein
3. File ka naam type karein — **`.gs` extension mat likhein**
   (Apps Script khud lagata hai)
4. Andar ka default code delete karke apni file ka content paste karein
5. Save karein

**Files ki poori list (isi order me banayein):**

| # | Apps Script me naam likhein | Kaam |
|---|------------------------------|------|
| 1 | `Code`         | Main router — doGet/doPost, setup |
| 2 | `Utility`      | Helper functions, sheet access |
| 3 | `Auth`         | Login, signup, OTP, password |
| 4 | `User`         | Profile, address book, image upload |
| 5 | `Product`      | Products, filter, search, sort |
| 6 | `Category`     | Categories |
| 7 | `Cart`         | Cart aur totals |
| 8 | `Wishlist`     | Saved products |
| 9 | `Order`        | Order place, track, cancel, return |
| 10 | `Payment`     | Payment record, refund |
| 11 | `Coupon`      | Coupon verify |
| 12 | `Review`      | Product reviews |
| 13 | `Message`     | Support chat, contact form |
| 14 | `Notification`| In-app notifications |
| 15 | `Delivery`    | Pincode check, shipment |
| 16 | `Content`     | Banners, FAQs |
| 17 | `Admin`       | Admin panel ke saare endpoints |

> ⚠️ **Zaroori:** Naam bilkul same rakhein (capital letter bhi same).
> Apps Script me saari files ek hi global scope share karti hain, isliye
> agar koi file miss ho gayi to "function is not defined" error aayega.

---

## STEP 3.5 — Sheet ID batayein (zaroori kab hai?)

Aapne poocha tha ki ek folder me multiple files hoti hain — to script ko kaise
pata chale ki **kaunsi** Sheet use karni hai. Iska jawab yahi hai.

### Pehle ye samajh lein — aapko ye step chahiye bhi ya nahi?

| Aapne script kaise banaya | Sheet ID chahiye? |
|---------------------------|-------------------|
| Sheet ke andar se: **Extensions → Apps Script** | ❌ **Nahi** — script apni Sheet khud dhoond leta hai |
| Alag se: [script.google.com](https://script.google.com) → New project | ✅ **Haan, zaroori hai** |
| Ek folder me multiple Sheets/scripts hain | ✅ **Haan** — warna galat Sheet se jud sakta hai |

Confusion ho to **ID de dena hi safe hai** — usse kabhi nuksaan nahi hota.

### Sheet ID dene ke 2 tarike

#### Tarika A — Code me paste karein (aasan)

`Utility.gs` file kholein. Sabse upar `CONFIG` me ye line milegi:

```javascript
var CONFIG = {
  SHEET_ID: '',        // <-- yahan paste karein
```

Apni ID daal dein:

```javascript
  SHEET_ID: '1AbCdEfGhIjKlMnOpQrStUvWxYz123456',
```

> 💡 **Poora URL paste kar diya?** Koi baat nahi — code khud usme se ID nikal
> leta hai. Dono chalega.

#### Tarika B — Script Properties (behtar)

Isme code chhune ki zaroorat nahi, aur ID code me dikhti bhi nahi:

1. Apps Script me **`Utility.gs`** kholein
2. `setSheetId()` function dhoondein (neeche ki taraf hai)
3. Usme apni ID paste karein:
   ```javascript
   var MY_SHEET_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz123456';
   ```
4. Function dropdown se **`setSheetId`** choose karke **▶ Run** dabayein
5. Execution log me ye dikhna chahiye:
   ```
   ✅ Sheet connected: "PShop Database"  (ID: 1AbCdEf...)
   ```

Ab ID permanently save ho gayi. `MY_SHEET_ID` line wapas khaali kar sakte hain.

> **Dono tarike lagaye to?** Script Properties wali ID jeetegi (Tarika B).

### Check karein ki sahi Sheet judi hai

`whichSheet()` function run karein. Log me dikhega:

```
Connected Sheet: "PShop Database"
URL: https://docs.google.com/spreadsheets/d/1AbCdEf.../edit
Tabs (17): Users, Products, Categories, Orders, ...
```

Agar galat Sheet ka naam dikhe, to ID galat hai — dobara copy karein.

---

## STEP 4 — Database setup function chalayein

Ye ek baar chalana hai. Isse saari sheets, headers, demo admin account,
categories aur coupons ban jayenge.

1. Editor ke upar function dropdown me **`setupDatabase`** select karein
2. **▶ Run** button dabayein
3. Pehli baar permission maangega:
   - **Review permissions** → apna Google account choose karein
   - "Google hasn't verified this app" warning aaye to:
     **Advanced** → **Go to PShop Database (unsafe)** → **Allow**
   - (Ye warning normal hai — ye aapka hi script hai)
4. Execution log me ye dikhna chahiye:
   ```
   ✅ PShop database setup complete. Sheets ready: Users, Products, ...
   ```

Ab apni Google Sheet wapas kholein — neeche **17 tabs** ban chuke honge. 🎉

**Jo accounts bane hain:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@pshop.in` | `admin123` |
| Customer | `demo@pshop.in` | `demo123` |

> 🔐 Live karne se pehle in dono ka password zaroor badal dena.

---

## STEP 5 — Web App deploy karein

1. Upar right me **Deploy** → **New deployment**
2. **Select type** ke bagal wale ⚙️ gear icon par click → **Web app**
3. Settings bilkul aise bharein:

   | Field | Value |
   |-------|-------|
   | Description | `PShop API v1` |
   | **Execute as** | **Me (your@gmail.com)** |
   | **Who has access** | **Anyone** |

   > "Anyone" zaroori hai — warna aapki website backend se baat nahi kar payegi.
   > Isse aapki sheet public nahi hoti, sirf script chal sakta hai.

4. **Deploy** dabayein
5. Jo **Web app URL** mile use **copy** kar lein. Aisa dikhega:

   ```
   https://script.google.com/macros/s/AKfycbx...............《long》.../exec
   ```

---

## STEP 6 — URL website me daalein

### Kaunsi file? Kahan?

```
PShop/
└── assets/
    └── js/
        └── core/
            └── config.js     ← YAHI FILE kholein
```

File kholte hi upar (line ~22) ye block dikhega:

```js
  /* ======================================================================
     ⬇⬇⬇  YAHAN APNA GOOGLE APPS SCRIPT URL PASTE KAREIN  ⬇⬇⬇
     ...
     ====================================================================== */
  API_BASE_URL: '',
```

Bas quotes ke andar apna URL paste karein:

```js
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbx....../exec',
```

Save karein. **Bas ho gaya!** Ab website ka saara data Google Sheets me jayega.

> ⚠️ Comma (`,`) end me lagana mat bhoolein, aur URL ke aage-peeche quotes hone chahiye.

### Do URL confuse mat karein

| URL | Kahan use hota hai |
|-----|--------------------|
| `https://docs.google.com/spreadsheets/d/**ID**/edit` | Ye **Sheet ID** hai → `Utility.gs` me (STEP 3.5) |
| `https://script.google.com/macros/s/.../exec` | Ye **API URL** hai → `config.js` me (ye step) |

Dono alag cheezein hain — aur dono ki jagah alag hai.

---

## STEP 7 — Test karein

### Test 0: Connection checker (sabse aasan) ⭐

Website me ek ready-made test page hai. Browser me kholein:

```
connect-test.html
```

URL paste karke **Test connection** dabayein. Ye 7 cheezein check karta hai —
URL format, backend zinda hai ya nahi, **kaunsi Sheet judi hai (naam + ID)**,
tables bane hain ya nahi, aur products/categories/login sach me chal rahe hain.

Har fail step ke saath likha hota hai ki **kaise theek karein**.

### Test 1: Backend zinda hai?

Apna `/exec` URL seedha browser me kholein. Ye JSON dikhna chahiye:

```json
{
  "success": true,
  "data": {
    "app": "PShop API",
    "status": "running",
    "spreadsheet": {
      "name": "PShop Database",
      "id": "1AbCdEfGhIjKlMnOpQrStUvWxYz123456"
    },
    "sheets": { "Users": 2, "Products": 0, "Categories": 8, ... }
  },
  "message": "PShop backend is live."
}
```

> `spreadsheet.name` dekhkar confirm kar lein ki **sahi** Sheet judi hai.

### Test 2: Website se login

1. Website kholein → **Login**
2. `demo@pshop.in` / `demo123` se login karein
3. Login ho jaye to backend connect ho chuka hai ✅

### Test 3: Order place karke sheet me dekhein

Cart me kuch daalein → checkout → order place karein →
Google Sheet ke **Orders** tab me naya row aa jayega.

---

## Products kaise add karein

**Do tarike hain:**

### Tarika 1 — Admin panel se (aasan)

1. `admin@pshop.in` se login karein
2. `admin/products.html` kholein
3. **Add Product** button se form bharein

### Tarika 2 — Seedha Sheet me (bulk ke liye)

**Products** tab me row add karein. Zaroori columns:

| Column | Example | Note |
|--------|---------|------|
| `id` | `P0001` | Unique hona chahiye |
| `name` | `AuraTech 5G Phone` | |
| `brand` | `AuraTech` | |
| `categoryId` | `c1` | Categories tab se |
| `category` | `Electronics` | |
| `categorySlug` | `electronics` | |
| `subCategory` | `Smartphones` | |
| `price` | `18999` | Sirf number, ₹ mat likhein |
| `mrp` | `24999` | |
| `stock` | `50` | |
| `images` | `["assets/img/products/p001-1.svg"]` | JSON array |
| `tags` | `["featured","trending"]` | JSON array |
| `specs` | `{"Brand":"AuraTech","Warranty":"1 Year"}` | JSON object |
| `status` | `active` | |

> 💡 Jo columns `[` ya `{` se shuru hote hain unme **valid JSON** likhna
> zaroori hai, warna wo plain text ban jayega.

---

## Zaroori settings badal lein

**`Utility.gs`** file me upar `CONFIG` object hai:

```js
var CONFIG = {
  SALT: 'PShop$2026$SecureSalt',   // ⚠️ Ise apna unique text kar dein
  ADMIN_EMAIL: 'admin@pshop.in',   // Apni email daalein
  SUPPORT_EMAIL: 'care@pshop.in',  // Apni support email
  SEND_EMAILS: true,               // false = OTP email band (testing ke liye)
  FREE_SHIP_ABOVE: 499,
  SHIPPING_FEE: 79,
  COD_FEE: 29
};
```

> 🔐 **SALT zaroor badlein** setup ke turant baad. Ye password hashing me
> use hota hai. Lekin **users ban jaane ke baad mat badalna** — warna
> purane passwords kaam karna band kar denge.

---

## Code update karne ke baad (bahut important!)

Jab bhi aap koi `.gs` file me change karein:

```
Deploy  →  Manage deployments  →  ✏️ (pencil icon)
   →  Version: "New version"  →  Deploy
```

> ❗ Sirf save karne se live URL update **nahi** hota. Naya version deploy
> karna zaroori hai. URL wahi rehta hai, badalta nahi.

---

## Common problems aur solution

| Problem | Kya karein |
|---------|-----------|
| `Koi spreadsheet nahi mila` | Sheet ID set nahi hai. **STEP 3.5** follow karein |
| `SHEET_ID galat hai ya pahunch nahi hai` | ID dobara copy karein. Sheet aapke hi Google account me honi chahiye |
| Data **galat Sheet** me jaa raha hai | `whichSheet()` run karke dekhein kaunsi judi hai, phir sahi ID set karein |
| Ek folder me kai Sheets hain, confusion ho raha | Har script ko uski apni `SHEET_ID` dein (Tarika B best hai) |
| `ReferenceError: apiLogin is not defined` | Koi `.gs` file paste karna reh gaya. List check karein |
| Website me kuch load nahi ho raha | Browser Console (F12) dekhein. `API_BASE_URL` sahi hai? URL `/exec` par khatam hona chahiye, `/dev` par nahi |
| `Authorization required` | Deploy settings me "Who has access" = **Anyone** karein |
| Data sheet me nahi aa raha | Purana deployment chal raha hai — naya version deploy karein |
| OTP email nahi aa rahi | Gmail ka daily limit 100 emails hai. Ya `SEND_EMAILS: false` karke test karein — code phir bhi verify hoga |
| "Exceeded maximum execution time" | Ek saath 5000+ products mat daalein. 500-1000 theek hai |
| Products dikh hi nahi rahe | `status` column me `active` likha hai? |

---

## Backend band ho jaye to kya hoga?

Kuch nahi bigdega. `config.js` me `USE_MOCK_FALLBACK: true` set hai,
isliye backend na chale to website apne aap **local demo data** par
chalne lagti hai. Aapko blank page kabhi nahi dikhega.

Sirf backend se chalana ho to:

```js
USE_MOCK_FALLBACK: false
```

---

## Free limits (Google ki taraf se)

| Cheez | Limit | Matlab |
|-------|-------|--------|
| Script run time | 6 min / execution | Kaafi hai |
| Emails | 100 / din | ~100 OTP roz |
| URL fetches | 20,000 / din | Bahut zyada hai |
| Sheet size | 10 lakh cells | ~30,000 products |
| Traffic | ~20k requests/din | Chhote-medium store ke liye theek |

Small aur medium business ke liye ye **bilkul kaafi** hai. Bahut bada
traffic ho jaye to Firebase ya Supabase par shift kar sakte hain —
`api.js` ka structure same rahega, sirf URL badlega.

---

## Security checklist (live karne se pehle)

- [ ] `CONFIG.SALT` badal diya
- [ ] Admin password badal diya (`admin123` nahi rakhna)
- [ ] Demo customer account delete kar diya
- [ ] `ADMIN_EMAIL` apni email par set ki
- [ ] Deployment "Execute as: Me" par hai
- [ ] Google Sheet kisi ke saath share nahi ki (script khud access karta hai)

---

## Data ka backup

Mahine me ek baar:

```
File  →  Download  →  Microsoft Excel (.xlsx)
```

Ya automatic backup ke liye Apps Script me trigger laga sakte hain
(`Triggers` → time-driven → daily).

---

**Koi dikkat aaye to `docs/README.md` me poori technical documentation hai.**
