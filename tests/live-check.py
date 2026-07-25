"""
PShop — Live backend check
Aapke deployed Apps Script URL ko browser se test karta hai.
Chalane ke liye:  python3 tests/live-check.py
"""
import asyncio, json, sys, re
from playwright.async_api import async_playwright

CONFIG = '/home/user/PShop/assets/js/core/config.js'
URL = re.search(r"API_BASE_URL: '([^']*)'", open(CONFIG).read()).group(1)

R = []
def ck(n, c, x=""):
    R.append((n, bool(c)))
    print(("  PASS  " if c else "  FAIL  ") + n + (f"  [{x}]" if x and not c else ""))

async def main():
    if not URL:
        print("config.js me API_BASE_URL set nahi hai."); return 1
    print(f"Testing: {URL[:70]}...\n")

    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await (await b.new_context()).new_page()
        await pg.goto("about:blank")

        async def api(action, payload=None):
            return await pg.evaluate("""async ([url, action, payload]) => {
                try {
                  const res = await fetch(url, {method:'POST',
                    body: JSON.stringify({action, payload: payload||{}}),
                    headers: {'Content-Type':'text/plain;charset=utf-8'},
                    redirect: 'follow'});
                  const t = await res.text();
                  try { return JSON.parse(t); }
                  catch { return {parseError: t.slice(0,150)}; }
                } catch(e) { return {netError: e.message}; }
            }""", [URL, action, payload])

        print("=== BACKEND REACHABLE ===")
        ping = await pg.evaluate("""async (url) => {
            const r = await fetch(url, {redirect:'follow'});
            return JSON.parse(await r.text());
        }""", URL)
        ck("ping JSON deta hai", ping.get("success") is True)
        sheet = ping.get("data", {}).get("spreadsheet", {})
        ck("Google Sheet judi hai", bool(sheet.get("id")), str(sheet))
        print(f"       Sheet: {sheet.get('name')} ({sheet.get('id','')[:20]}...)")

        counts = ping.get("data", {}).get("sheets", {})
        total = sum(v for v in counts.values() if isinstance(v, int))
        print(f"       Total rows: {total}")

        print("\n=== POST REQUESTS ===")
        cats = await api("getCategories")
        ck("POST kaam kar raha (HTML nahi)", "parseError" not in cats and "netError" not in cats,
           str(cats)[:90])
        ck("getCategories JSON", cats.get("success") is True)

        prods = await api("getProducts", {"pageSize": 3})
        ck("getProducts JSON", prods.get("success") is True)
        n_prod = prods.get("data", {}).get("total", 0)

        print("\n=== DATA CHECK ===")
        if total == 0:
            print("  ⚠️  Sheet BILKUL KHAALI hai — setupDemoStore() nahi chala")
            print("      Ye error nahi hai, bas seed function run karna baaki hai.")
            ck("data mila", False, "0 rows — setupDemoStore() chalayein")
        else:
            ck(f"products hain ({n_prod})", n_prod > 0, str(n_prod))
            ck("categories hain", len(cats.get("data", {}).get("items", [])) > 0)
            login = await api("login", {"identifier": "admin@pshop.in", "password": "admin123"})
            ck("admin login kaam kar raha", login.get("success") is True, login.get("message", ""))
            demo = await api("login", {"identifier": "demo@pshop.in", "password": "demo123"})
            ck("demo login kaam kar raha", demo.get("success") is True, demo.get("message", ""))
            ck("banners hain", len((await api("getBanners")).get("data", {}).get("items", [])) > 0)
            ck("faqs hain", len((await api("getFaqs")).get("data", {}).get("items", [])) > 0)

        print("\n=== ERROR HANDLING ===")
        unk = await api("thisDoesNotExist")
        ck("unknown action par saaf error", unk.get("success") is False and unk.get("code") == 404)
        guard = await api("placeOrder", {})
        ck("protected route bina token block", guard.get("success") is False)

        await b.close()

    p = sum(1 for _, o in R if o)
    print("\n" + "=" * 56)
    print(f"  {p}/{len(R)} passed")
    if p < len(R):
        print("\n  Kya karna hai:")
        for n, o in R:
            if not o and "setupDemoStore" in str(n) or (not o and "data mila" in n):
                print("   → Apps Script me setupDemoStore() run karein, phir NEW VERSION deploy karein")
                break
    print("=" * 56)
    return 0 if p == len(R) else 1

sys.exit(asyncio.run(main()))
