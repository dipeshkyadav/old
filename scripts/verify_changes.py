
from playwright.sync_api import sync_playwright, expect
import time

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant geolocation permissions and set location
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            permissions=['geolocation'],
            geolocation={'latitude': 27.7172, 'longitude': 85.3240} # Kathmandu coordinates
        )
        page = context.new_page()

        # 1. Test Home Page Loading and Image Replacement
        print("Navigating to Home Page...")
        try:
            page.goto("http://localhost:3001")
            # Wait for content to load
            expect(page.get_by_role("heading", name="Recently Listed")).to_be_visible(timeout=10000)

            # Take screenshot of Home Page
            page.screenshot(path="/home/jules/verification/01_home_page.png")
            print("Home Page screenshot taken.")
        except Exception as e:
            print(f"Error on Home Page: {e}")

        # 2. Test Buyer Dashboard (Pagination)
        print("Navigating to Buyer Dashboard...")
        try:
            page.goto("http://localhost:3001/dashboard/buyer")
            # Wait for books to load
            expect(page.get_by_text("Search Results").or_(page.get_by_text("Recommended For You"))).to_be_visible(timeout=10000)

            page.screenshot(path="/home/jules/verification/02_buyer_dashboard.png")
            print("Buyer Dashboard screenshot taken.")
        except Exception as e:
            print(f"Error on Buyer Dashboard: {e}")

        # 3. Test Seller Dashboard - Valuation Feature
        print("Testing Seller Dashboard Valuation...")
        try:
            # Register a new seller
            print("Registering new seller...")
            page.goto("http://localhost:3001/register")
            unique_id = int(time.time())

            # Select Role (Buttons, not select)
            page.click("button:has-text('seller')")

            page.fill("input[name='name']", "Test Seller")
            page.fill("input[name='email']", f"seller{unique_id}@test.com")
            page.fill("input[name='phone']", f"{unique_id}")
            page.fill("input[name='password']", "password123")

            # Fill Seller Address Details
            page.fill("input[name='address']", "123 Test St")
            page.fill("input[name='city']", "Kathmandu")
            page.fill("input[name='state']", "Bagmati")
            page.fill("input[name='pincode']", "44600")

            # Submit Registration
            page.click("button[type='submit']")

            # Wait for redirect to login
            expect(page).to_have_url("http://localhost:3001/login", timeout=10000)
            print("Registration successful, redirected to login.")

            # Login
            print("Logging in...")
            page.fill("input[placeholder='Enter email or phone number']", f"seller{unique_id}@test.com")
            page.fill("input[placeholder='Enter your password']", "password123")
            page.click("button:has-text('Sign In')")

            # Wait for redirect (likely to /)
            expect(page).to_have_url("http://localhost:3001/", timeout=15000)
            print("Login successful, redirected to home.")

            # Navigate to Seller Dashboard
            print("Navigating to Seller Dashboard...")
            page.goto("http://localhost:3001/dashboard/seller")

            # Open Add Book Modal
            expect(page.get_by_role("button", name="Add New Book")).to_be_visible(timeout=10000)
            page.click("button:has-text('Add New Book')")

            # Fill Valuation fields
            expect(page.get_by_role("heading", name="Add New Book")).to_be_visible()

            page.fill("input[name='title']", "Harry Potter")
            # No author field in form!

            # Inputs/Selects
            page.fill("input[name='category']", "Fiction")
            page.select_option("select[name='condition']", "good")
            page.fill("input[name='originalPrice']", "1000")

            # Click Get Valuation
            print("Clicking Get Valuation...")
            page.click("button:has-text('Get Price Valuation')")

            # Wait for valuation result
            expect(page.get_by_text("Estimated Value:")).to_be_visible(timeout=10000)

            # Take screenshot of valuation
            page.screenshot(path="/home/jules/verification/03_valuation_modal.png")
            print("Valuation screenshot taken.")

        except Exception as e:
            print(f"Error testing Seller Dashboard: {e}")
            page.screenshot(path="/home/jules/verification/error_screenshot.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
