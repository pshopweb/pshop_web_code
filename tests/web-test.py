"""
PShop — Website connection test
Local server chalakar dekhta hai ki website backend se data la rahi hai ya nahi.
Chalane ke liye:  bash tests/run-web-test.sh
"""
import asyncio, sys
from playwright.async_api import async_playwright

B = "http://localhost:8899/"


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await (await browser.new_context()).new_page()

        errs, failed_reqs, api_calls = [], [], []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
        page.on("requestfailed", lambda r: failed_reqs.append(f"{r.url[:70]} -> {r.failure}"))
        page.on("request", lambda r: api_calls.append(r.url[:60])
                if "script.google.com" in r.url else None)

        print("=== HOME PAGE ===")
        await page.goto(B + "index.html", wait_until="networkidle")
        await page.wait_for_timeout(6000)
        cards = await page.locator(".product-card").count()
        cats = await page.locator("#cat-grid .cat-tile").count()
        print(f"  products dikhe : {cards}")
        print(f"  categories     : {cats}")

        print("\n=== SHOP PAGE ===")
        await page.goto(B + "pages/shop.html", wait_until="networkidle")
        await page.wait_for_timeout(6000)
        shop_cards = await page.locator(".product-card").count()
        count_text = await page.text_content("#result-count")
        print(f"  products : {shop_cards}")
        print(f"  count    : {count_text}")

        print(f"\n=== APPS SCRIPT CALLS: {len(api_calls)} ===")
        if api_calls:
            print("  backend ko call ja rahi hai (sahi hai)")
        else:
            print("  koi call NAHI gayi -> website mock data use kar rahi hai")

        if errs:
            print("\n=== JS ERRORS ===")
            for e in errs[:6]:
                print("  !", e[:170])

        if failed_reqs:
            print("\n=== FAILED REQUESTS ===")
            for r in failed_reqs[:6]:
                print("  !", r)

        if not errs and not failed_reqs:
            print("\n  koi JS error nahi")

        await browser.close()

        ok = cards > 0 and shop_cards > 0
        print("\n" + "=" * 50)
        print("  RESULT:", "website me data dikh raha hai" if ok
              else "website KHAALI hai - data nahi aa raha")
        print("=" * 50)
        return 0 if ok else 1


sys.exit(asyncio.run(main()))
