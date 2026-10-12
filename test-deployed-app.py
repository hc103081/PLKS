#!/usr/bin/env python3
"""Test deployed PLKS application at https://plks.vercel.app"""

from playwright.sync_api import sync_playwright
import time

BASE_URL = "https://plks.vercel.app"
API_URL = "https://plksapi-production.up.railway.app"

def test_deployed_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # headful for debugging
        page = browser.new_page()
        
        # Enable console logging
        page.on("console", lambda msg: print(f"[CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))
        
        print("\n=== 1. 測試首頁載入 ===")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        page.screenshot(path="/tmp/01-homepage.png", full_page=True)
        print(f"✓ 首頁載入完成: {page.url}")
        
        # 檢查登入頁元素
        print("\n=== 2. 檢查登入頁元素 ===")
        login_elements = {
            "google_btn": 'button:has-text("Google")',
            "email_input": 'input[type="email"]',
            "submit_btn": 'button[type="submit"]',
            "title": 'text=PLKS',
        }
        
        for name, selector in login_elements.items():
            try:
                el = page.locator(selector).first
                if el.count() > 0:
                    print(f"  ✓ 找到 {name}: {selector}")
                else:
                    print(f"  ✗ 找不到 {name}: {selector}")
            except Exception as e:
                print(f"  ✗ 檢查 {name} 錯誤: {e}")
        
        print("\n=== 3. 點擊 Google 登入按鈕 ===")
        google_btn = page.locator('button:has-text("Google")').first
        if google_btn.count() > 0:
            google_btn.click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(3000)  # 等待 OAuth 重導向
            page.screenshot(path="/tmp/02-after-google-click.png", full_page=True)
            print(f"  當前 URL: {page.url}")
            
            # 檢查是否導向 Supabase OAuth
            if "supabase" in page.url or "auth" in page.url:
                print("  ✓ 成功導向 OAuth 頁面")
            else:
                print("  ⚠ 未導向 OAuth，可能已登入或有其他問題")
        else:
            print("  ✗ 找不到 Google 登入按鈕")
        
        print("\n=== 4. 檢查儀表板 (若已登入) ===")
        if "/dashboard" in page.url or "/#" in page.url:
            page.wait_for_load_state("networkidle")
            page.screenshot(path="/tmp/03-dashboard.png", full_page=True)
            
            # 檢查課程列表 API 呼叫
            print("  等待 API 呼叫...")
            page.wait_for_timeout(2000)
            
            # 嘗試找到新增課程按鈕
            create_btn = page.locator('button:has-text("新增"), button:has-text("建立"), button:has-text("Create")').first
            if create_btn.count() > 0:
                print("  ✓ 找到新增課程按鈕")
                
                print("\n=== 5. 測試新增課程 ===")
                create_btn.click()
                page.wait_for_timeout(1000)
                page.screenshot(path="/tmp/04-create-modal.png", full_page=True)
                
                # 填寫表單
                try:
                    page.fill('input[name="code"], input[placeholder*="代碼"], input[placeholder*="code"]', "TEST101")
                    page.fill('input[name="name"], input[placeholder*="名稱"], input[placeholder*="name"]', "測試課程")
                    page.fill('input[name="credits"], input[type="number"]', "3")
                    print("  ✓ 表單填寫完成")
                    
                    # 提交
                    submit_btn = page.locator('button[type="submit"], button:has-text("建立"), button:has-text("確定")').first
                    if submit_btn.count() > 0:
                        submit_btn.click()
                        page.wait_for_load_state("networkidle")
                        page.wait_for_timeout(2000)
                        page.screenshot(path="/tmp/05-after-create.png", full_page=True)
                        print("  ✓ 提交完成")
                    else:
                        print("  ✗ 找不到提交按鈕")
                except Exception as e:
                    print(f"  ✗ 表單操作錯誤: {e}")
            else:
                print("  ✗ 找不到新增課程按鈕")
        else:
            print("  尚未進入儀表板，跳過儀表板測試")
        
        print("\n=== 6. 檢查控制台錯誤 ===")
        # 已經在 console listener 中輸出
        
        print("\n=== 測試完成 ===")
        browser.close()

if __name__ == "__main__":
    test_deployed_app()