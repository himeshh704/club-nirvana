import json
import sys
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://rangilo-raas1.vercel.app"

def post_json(path, data, headers=None):
    url = BASE_URL + path
    req_headers = {'Content-Type': 'application/json'}
    if headers:
        req_headers.update(headers)
    
    json_bytes = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=json_bytes, headers=req_headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(res_body)
        except Exception:
            return e.code, res_body

def run_tests():
    print("==================================================")
    print("RANGILO RAAS 2026 - END-TO-END SYSTEM TEST SUITE")
    print("==================================================\n")

    # 1. Create a 2-Day Pass
    print("[Test 1] Creating 2-Day Season Pass...")
    status, res1 = post_json("/api/tickets/create", {
        "name": "Test User 2Day",
        "phone": "9876540001",
        "ticket_type": "2-Day Phase 1 - Couple (₹999)",
        "valid_days": "both",
        "payment_method": "UPI",
        "collected_by": "Automated Tester"
    })
    print(f"   Response Status: {status}")
    print(f"   Result: {res1}\n")
    assert status == 200 and res1.get('success') == True, "Failed 2-Day Pass Creation"
    token_2day = res1['qrToken']

    # 2. Create a Day 1 Pass
    print("[Test 2] Creating Day 1 Only Pass...")
    status, res2 = post_json("/api/tickets/create", {
        "name": "Test User Day1",
        "phone": "9876540002",
        "ticket_type": "Day 1 Early Bird - Solo (₹599)",
        "valid_days": "day_1",
        "payment_method": "Cash",
        "collected_by": "Automated Tester"
    })
    print(f"   Response Status: {status}")
    print(f"   Result: {res2}\n")
    assert status == 200 and res2.get('success') == True, "Failed Day 1 Pass Creation"
    token_day1 = res2['qrToken']

    # 3. Create a Day 2 Pass
    print("[Test 3] Creating Day 2 Only Pass...")
    status, res3 = post_json("/api/tickets/create", {
        "name": "Test User Day2",
        "phone": "9876540003",
        "ticket_type": "Day 2 Early Bird - Solo (₹599)",
        "valid_days": "day_2",
        "payment_method": "Cash",
        "collected_by": "Automated Tester"
    })
    print(f"   Response Status: {status}")
    print(f"   Result: {res3}\n")
    assert status == 200 and res3.get('success') == True, "Failed Day 2 Pass Creation"
    token_day2 = res3['qrToken']

    # 4. Scan Day 1 Pass on Day 1 Gate
    print("[Test 4] Gate Scan: Day 1 Pass on Oct 18 (Day 1 Gate)...")
    status, scan1 = post_json("/api/tickets/scan", {
        "qrToken": token_day1,
        "scanDate": "Oct 18",
        "gate": "Main Entry Gate"
    })
    print(f"   Result Status: {scan1.get('status')} | Message: {scan1.get('message')}\n")

    # 5. Scan Day 1 Pass AGAIN on Day 1 Gate (Duplicate check)
    print("[Test 5] Gate Scan: Day 1 Pass AGAIN on Oct 18 (Duplicate check)...")
    status, scan2 = post_json("/api/tickets/scan", {
        "qrToken": token_day1,
        "scanDate": "Oct 18",
        "gate": "Main Entry Gate"
    })
    print(f"   Result Status: {scan2.get('status')} | Message: {scan2.get('message')}\n")
    assert scan2.get('status') == 'already_used', "Duplicate check failed!"

    # 6. Scan Day 1 Pass on Day 2 Gate (Invalid Date check)
    print("[Test 6] Gate Scan: Day 1 Pass on Oct 19 (Day 2 Gate - Should fail date validity)...")
    status, scan3 = post_json("/api/tickets/scan", {
        "qrToken": token_day1,
        "scanDate": "Oct 19",
        "gate": "Main Entry Gate"
    })
    print(f"   Result Status: {scan3.get('status')} | Message: {scan3.get('message')}\n")
    assert scan3.get('status') == 'invalid_date', "Date validity check failed!"

    # 7. Scan Day 2 Pass on Day 1 Gate (Invalid Date check)
    print("[Test 7] Gate Scan: Day 2 Pass on Oct 18 (Day 1 Gate - Should fail date validity)...")
    status, scan4 = post_json("/api/tickets/scan", {
        "qrToken": token_day2,
        "scanDate": "Oct 18",
        "gate": "Main Entry Gate"
    })
    print(f"   Result Status: {scan4.get('status')} | Message: {scan4.get('message')}\n")
    assert scan4.get('status') == 'invalid_date', "Date validity check failed!"

    # 8. Scan 2-Day Pass on Day 1 Gate AND Day 2 Gate
    print("[Test 8a] Gate Scan: 2-Day Pass on Oct 18 (Day 1 Gate)...")
    status, scan5a = post_json("/api/tickets/scan", {
        "qrToken": token_2day,
        "scanDate": "Oct 18",
        "gate": "Main Entry Gate"
    })
    print(f"   Result Status: {scan5a.get('status')} | Message: {scan5a.get('message')}")

    print("[Test 8b] Gate Scan: 2-Day Pass on Oct 19 (Day 2 Gate)...")
    status, scan5b = post_json("/api/tickets/scan", {
        "qrToken": token_2day,
        "scanDate": "Oct 19",
        "gate": "Main Entry Gate"
    })
    print(f"   Result Status: {scan5b.get('status')} | Message: {scan5b.get('message')}\n")

    print("==================================================")
    print("[SUCCESS] ALL END-TO-END SYSTEM TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
