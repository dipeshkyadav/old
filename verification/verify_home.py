from playwright.sync_api import sync_playwright

def verify_homepage():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to homepage...")
            page.goto("http://localhost:3001")

            # Wait for content to load
            page.wait_for_selector("text=Give Old Books")

            # Check for featured books section
            page.wait_for_selector("text=Recently Listed")

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/homepage_verified.png")
            print("Screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_homepage()
