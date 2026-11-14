"""Selenium E2E — uses /usr/bin/chromium via chromium-driver (apt-installed).
Run: python e2e_selenium.py
"""
import sys, time
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE = "http://localhost:3000"
FAILS = []

def make_driver():
    o = Options()
    o.add_argument("--headless=new")
    o.add_argument("--no-sandbox")
    o.add_argument("--disable-dev-shm-usage")
    o.binary_location = "/usr/bin/chromium"
    return webdriver.Chrome(options=o)

# 1. Homepage
d = make_driver()
try:
    d.get(BASE)
    WebDriverWait(d, 10).until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
    assert "Learn Without Limits" in d.find_element(By.TAG_NAME, "h1").text
    body = d.find_element(By.TAG_NAME, "body").text
    assert "Valentine Otieno Ogutu" in body
    assert "Software Engineer" in body
    assert "ogutuvalentine6-a11y" in body
    print("✅ homepage — hero + founder + footer")
except Exception as e:
    FAILS.append(("homepage", str(e)[:200])); print(f"❌ homepage: {str(e)[:150]}")
finally:
    d.quit()

# 2. Public reels
d = make_driver()
try:
    d.get(f"{BASE}/reels"); time.sleep(1.5)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "Educational Reels" in body, body[:200]
    assert "Not authenticated" not in body
    print("✅ public reels feed")
except Exception as e:
    FAILS.append(("reels", str(e)[:200])); print(f"❌ reels: {str(e)[:150]}")
finally:
    d.quit()

# 3. Public resources
d = make_driver()
try:
    d.get(f"{BASE}/resources"); time.sleep(1.5)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "Resource Library" in body, body[:200]
    print("✅ public resources library")
except Exception as e:
    FAILS.append(("resources", str(e)[:200])); print(f"❌ resources: {str(e)[:150]}")
finally:
    d.quit()

# 4. Public courses page
d = make_driver()
try:
    d.get(f"{BASE}/courses"); time.sleep(1.5)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "Explore Courses" in body
    print("✅ /courses loads")
except Exception as e:
    FAILS.append(("courses-page", str(e)[:200])); print(f"❌ /courses: {str(e)[:150]}")
finally:
    d.quit()

# 5. Public instructors page
d = make_driver()
try:
    d.get(f"{BASE}/instructors"); time.sleep(1.5)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "Our Instructors" in body
    print("✅ /instructors loads")
except Exception as e:
    FAILS.append(("instructors-page", str(e)[:200])); print(f"❌ /instructors: {str(e)[:150]}")
finally:
    d.quit()

# 6. Public events page
d = make_driver()
try:
    d.get(f"{BASE}/events"); time.sleep(1.5)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "Upcoming Events" in body
    print("✅ /events loads")
except Exception as e:
    FAILS.append(("events-page", str(e)[:200])); print(f"❌ /events: {str(e)[:150]}")
finally:
    d.quit()

# 7. Certificates verify page
d = make_driver()
try:
    d.get(f"{BASE}/certificates"); time.sleep(1.5)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "Verify Certificate" in body
    print("✅ /certificates loads")
except Exception as e:
    FAILS.append(("certificates-page", str(e)[:200])); print(f"❌ /certificates: {str(e)[:150]}")
finally:
    d.quit()

# 8. About page
d = make_driver()
try:
    d.get(f"{BASE}/about"); time.sleep(1.5)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "About Learn" in body
    assert "Valentine Otieno Ogutu" in body
    print("✅ /about loads with founder")
except Exception as e:
    FAILS.append(("about-page", str(e)[:200])); print(f"❌ /about: {str(e)[:150]}")
finally:
    d.quit()

# 9. Contact page
d = make_driver()
try:
    d.get(f"{BASE}/contact"); time.sleep(1.5)
    body = d.find_element(By.TAG_NAME, "body").text
    assert "Contact" in body
    print("✅ /contact loads")
except Exception as e:
    FAILS.append(("contact-page", str(e)[:200])); print(f"❌ /contact: {str(e)[:150]}")
finally:
    d.quit()

# 4. Register → login → dashboard
stamp = int(time.time() * 1000)
email = f"sel-{stamp}@example.com"
idn = f"SEL-{stamp}"
name = "Selenium Student"
pw = "Passw0rd!"

r = requests.post(f"{BASE}/api/auth-register", json={
    "idNumber": idn, "fullName": name, "email": email,
    "phone": "+254700000000", "location": "Nairobi", "school": "Test U",
    "fieldOfStudy": "CS", "courseOfStudy": "BSc", "password": pw,
}, timeout=10)
assert r.status_code == 201, r.text

d = make_driver()
try:
    d.get(f"{BASE}/login")
    WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
    d.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    d.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(pw)
    d.find_element(By.XPATH, "//button[normalize-space()='Login']").click()
    WebDriverWait(d, 15).until(EC.url_contains("/student/dashboard"))
    time.sleep(1.5)
    body = d.find_element(By.TAG_NAME, "body").text
    assert f"Welcome, {name}" in body
    assert email in body
    print("✅ register → login → dashboard with real name")
except Exception as e:
    FAILS.append(("auth-flow", str(e)[:200])); print(f"❌ auth-flow: {str(e)[:150]}")
finally:
    d.quit()

print()
if FAILS:
    print(f"══════ {len(FAILS)} FAILURE(S) ══════")
    for n, err in FAILS: print(f"  {n}: {err}")
    sys.exit(1)
print("═══════════════════════════════════════")
print("✅ ALL E2E TESTS PASSED")
print("═══════════════════════════════════════")
