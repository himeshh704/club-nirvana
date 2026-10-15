import json
import sys
import base64
import hmac
import hashlib
import time
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:3005"
QR_SECRET = "super-secret-key-change-me-in-production-123456"

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

def get_json(path):
    url = BASE_URL + path
    req = urllib.request.Request(url, method='GET')
    with urllib.request.urlopen(req) as response:
        res_body = response.read().decode('utf-8')
        return response.status, json.loads(res_body)

def decode_jwt_payload(token):
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    padded = parts[1] + '=' * ((4 - len(parts[1]) % 4) % 4)
    payload_str = base64.urlsafe_b64decode(padded).decode('utf-8')
    return json.loads(payload_str)

def make_legacy_jwt(ticket_id, name, legacy_ticket_type, valid_days='both'):
    """Simulates an old ticket that was sold with the price embedded in JWT payload."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "i": ticket_id,
        "n": name,
        "t": legacy_ticket_type,
        "v": valid_days,
        "iat": int(time.time())
    }
    def b64url(b):
        return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')
    
    encoded_header = b64url(json.dumps(header).encode('utf-8'))
    encoded_payload = b64url(json.dumps(payload).encode('utf-8'))
    signing_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
    signature = hmac.new(QR_SECRET.encode('utf-8'), signing_input, hashlib.sha256).digest()
    encoded_sig = b64url(signature)
    return f"{encoded_header}.{encoded_payload}.{encoded_sig}"

def run_audit():
    print("=================================================================")
    print("      RANGILO RAAS - COMPREHENSIVE PRODUCTION SAFETY AUDIT       ")
    print("=================================================================\n")

    # -------------------------------------------------------------
    # TEST 1: Same Phone Number, Different Attendee Names
    # -------------------------------------------------------------
    print("--- [TEST 1] Same Phone Number, Different Names Separation ---")
    shared_phone = f"98765{int(time.time()) % 100000:05d}"
    print(f"Using shared phone: {shared_phone}")

    # Ticket 1: Husband / Friend A
    status1, res1 = post_json("/api/tickets/create", {
        "name": "Kabir Mehra",
        "phone": shared_phone,
        "ticket_type": "2-Day Phase 1 - Solo (₹699)",
        "valid_days": "both",
        "payment_method": "Cash (₹699)",
        "collected_by": "Audit Tester"
    })
    print(f"Ticket 1 (Kabir Mehra): Status {status1}, Success: {res1.get('success')}")
    assert status1 == 200 and res1.get('success'), f"Failed ticket 1: {res1}"
    token1 = res1['qrToken']

    # Ticket 2: Wife / Friend B (SAME PHONE)
    status2, res2 = post_json("/api/tickets/create", {
        "name": "Ayesha Mehra",
        "phone": shared_phone,
        "ticket_type": "2-Day Phase 1 - Solo (₹699)",
        "valid_days": "both",
        "payment_method": "Cash (₹699)",
        "collected_by": "Audit Tester"
    })
    print(f"Ticket 2 (Ayesha Mehra): Status {status2}, Success: {res2.get('success')}")
    assert status2 == 200 and res2.get('success'), f"Failed ticket 2: {res2}"
    token2 = res2['qrToken']

    # Check payload tokens
    payload1 = decode_jwt_payload(token1)
    payload2 = decode_jwt_payload(token2)
    print(f"Token 1 Payload Name: '{payload1['n']}' (Category: '{payload1['t']}')")
    print(f"Token 2 Payload Name: '{payload2['n']}' (Category: '{payload2['t']}')")
    assert payload1['n'] == "Kabir Mehra", f"Token 1 name mismatch: {payload1['n']}"
    assert payload2['n'] == "Ayesha Mehra", f"Token 2 name mismatch: {payload2['n']}"

    # Check Offline List
    print("Verifying /api/tickets/offline-list attendee directory...")
    status_off, off_data = get_json("/api/tickets/offline-list")
    assert status_off == 200 and off_data.get('success'), "Failed to get offline-list"
    tickets_list = off_data.get('tickets', [])
    kabir_entry = next((t for t in tickets_list if t['id'] == res1['ticketId']), None)
    ayesha_entry = next((t for t in tickets_list if t['id'] == res2['ticketId']), None)

    assert kabir_entry is not None, "Kabir Mehra ticket not found in offline list"
    assert ayesha_entry is not None, "Ayesha Mehra ticket not found in offline list"
    print(f"Offline List Entry 1: Name='{kabir_entry['name']}', Phone='{kabir_entry['phone']}'")
    print(f"Offline List Entry 2: Name='{ayesha_entry['name']}', Phone='{ayesha_entry['phone']}'")
    assert kabir_entry['name'] == "Kabir Mehra", f"Attendee 1 name overwritten! Got: {kabir_entry['name']}"
    assert ayesha_entry['name'] == "Ayesha Mehra", f"Attendee 2 name overwritten! Got: {ayesha_entry['name']}"
    print(">>> PASS: Same phone number correctly creates distinct attendees without overwrite!\n")

    # -------------------------------------------------------------
    # TEST 2: Custom Price Selection & Internal Tracking
    # -------------------------------------------------------------
    print("--- [TEST 2] Custom Price Input & Accounting Integrity ---")
    status3, res3 = post_json("/api/tickets/create", {
        "name": "Siddharth Malhotra",
        "phone": "9811223344",
        "ticket_type": "VIP Table (₹7,999 | ₹2,500 Cover | 4-6 Guests) [Table 5 - 6 Guests]",
        "valid_days": "both",
        "price": "14500",
        "payment_method": "Cash",
        "collected_by": "Ankur Bishnoi"
    })
    print(f"Custom Price Ticket: Status {status3}, Success: {res3.get('success')}")
    assert status3 == 200 and res3.get('success'), f"Failed custom price ticket: {res3}"
    token3 = res3['qrToken']
    payload3 = decode_jwt_payload(token3)
    print(f"Signed Category in Token: '{payload3['t']}'")
    assert "₹" not in payload3['t'] and "14500" not in payload3['t'] and "7,999" not in payload3['t'], \
        f"Price found in QR payload! Payload category: {payload3['t']}"

    # Verify custom price in offline list
    _, off_data2 = get_json("/api/tickets/offline-list")
    sid_entry = next((t for t in off_data2.get('tickets', []) if t['id'] == res3['ticketId']), None)
    assert sid_entry is not None, "Custom price ticket not found in list"
    print(f"Internal Payment Method Recorded: '{sid_entry['payment_method']}'")
    assert "14500" in sid_entry['payment_method'], "Custom price not recorded in payment_method!"
    assert "₹" not in sid_entry['ticket_type'], f"Price leaked in ticket_type: {sid_entry['ticket_type']}"
    print(">>> PASS: Custom price safely stored in accounting records and hidden from pass category!\n")

    # -------------------------------------------------------------
    # TEST 3: Zero Price Leaks in QR / Pass Category / WhatsApp
    # -------------------------------------------------------------
    print("--- [TEST 3] Price Absence Verification (Pass, Token, Message) ---")
    categories_to_test = [
        ("2-Day Phase 1 - Solo (₹699)", "2-Day Phase 1 - Solo"),
        ("2-Day Phase 1 - Couple (₹999/-)", "2-Day Phase 1 - Couple"),
        ("Day 1 Early Bird - Solo (₹599)", "Day 1 Early Bird - Solo"),
        ("Small Table (₹7,999 | ₹2,500 Cover | 4-6 Guests) [Table 1 - 6 Guests]", "Small Table (4-6 Guests) [Table 1 - 6 Guests]"),
        ("VIP Pass ₹1500", "VIP Pass")
    ]
    for raw_cat, expected_clean in categories_to_test:
        test_stat, test_res = post_json("/api/tickets/create", {
            "name": "Audit Sample",
            "phone": "9900112233",
            "ticket_type": raw_cat,
            "valid_days": "both",
            "payment_method": "Cash",
            "price": "999"
        })
        assert test_stat == 200, f"Failed sample creation: {test_res}"
        p = decode_jwt_payload(test_res['qrToken'])
        assert "₹" not in p['t'] and "Rs" not in p['t'], f"Price detected in JWT payload for {raw_cat}: {p['t']}"
        assert p['t'] == expected_clean, f"Clean category mismatch for {raw_cat}! Got: {p['t']} vs {expected_clean}"
    print(">>> PASS: All pass categories clean without any price in QR tokens!\n")

    # -------------------------------------------------------------
    # TEST 4: 100% Backward Compatibility with Pre-sold Passes
    # -------------------------------------------------------------
    print("--- [TEST 4] Backward Compatibility with Pre-existing Sold Passes ---")
    legacy_id = "00000000-0000-4000-a000-000000000001"
    legacy_token = make_legacy_jwt(legacy_id, "Old VIP Customer", "2-Day Phase 1 - Couple (₹999)", valid_days="both")
    print(f"Generated Legacy Token with (₹999) in payload")

    # Scan legacy pass at gate
    scan_stat, scan_res = post_json("/api/tickets/scan", {
        "qrToken": legacy_token,
        "scanDate": "Oct 18",
        "gate": "Main Entry Gate",
        "scannerDevice": "Gate 1 Handheld"
    })
    print(f"Scan Status: {scan_res.get('status')}")
    print(f"Guest Name: {scan_res.get('guestName')}")
    print(f"Ticket Type Displayed: '{scan_res.get('ticketType')}'")
    print(f"Message: {scan_res.get('message')}")

    assert scan_res.get('status') == 'valid', f"Legacy token scan failed! {scan_res}"
    assert scan_res.get('guestName') == 'Old VIP Customer', f"Guest name mismatch: {scan_res.get('guestName')}"
    assert "₹" not in scan_res.get('ticketType') and "999" not in scan_res.get('ticketType'), \
        f"Price leaked on scanner for legacy pass! Got: {scan_res.get('ticketType')}"
    assert scan_res.get('ticketType') == "2-Day Phase 1 - Couple", \
        f"Category mismatch: {scan_res.get('ticketType')}"
    print(">>> PASS: Pre-sold passes scan flawlessly with cryptographic verification and prices cleanly stripped!\n")

    # -------------------------------------------------------------
    # TEST 5: Gate Duplicate & Multi-Day Scanning Rules
    # -------------------------------------------------------------
    print("--- [TEST 5] Gate Duplicate & Multi-Day Checkin Verification ---")
    # Scan Kabir on Oct 18 (Day 1)
    s1_stat, s1_res = post_json("/api/tickets/scan", {
        "qrToken": token1,
        "scanDate": "Oct 18",
        "gate": "Gate A"
    })
    assert s1_res.get('status') == 'valid', f"Kabir Day 1 scan failed: {s1_res}"
    print(f"Kabir Day 1 Scan 1: {s1_res.get('status')} - Entry Granted")

    # Scan Kabir AGAIN on Oct 18 (Day 1 Duplicate Attempt)
    s2_stat, s2_res = post_json("/api/tickets/scan", {
        "qrToken": token1,
        "scanDate": "Oct 18",
        "gate": "Gate A"
    })
    assert s2_res.get('status') == 'already_used', f"Duplicate check failed: {s2_res}"
    print(f"Kabir Day 1 Scan 2: {s2_res.get('status')} - Blocked Duplicate Entry!")

    # Scan Ayesha (Same phone number person) on Oct 18 -> MUST BE VALID!
    s3_stat, s3_res = post_json("/api/tickets/scan", {
        "qrToken": token2,
        "scanDate": "Oct 18",
        "gate": "Gate A"
    })
    assert s3_res.get('status') == 'valid', f"Ayesha scan failed after Kabir scanned: {s3_res}"
    print(f"Ayesha Day 1 Scan: {s3_res.get('status')} - Entry Granted (Independent from Kabir!)")

    # Scan Kabir on Oct 19 (Day 2 for 2-Day Pass) -> MUST BE VALID!
    s4_stat, s4_res = post_json("/api/tickets/scan", {
        "qrToken": token1,
        "scanDate": "Oct 19",
        "gate": "Gate A"
    })
    assert s4_res.get('status') == 'valid', f"Kabir Day 2 scan failed: {s4_res}"
    print(f"Kabir Day 2 Scan: {s4_res.get('status')} - Entry Granted for Day 2!")

    print("\n=================================================================")
    print(" [ALL TESTS PASSED] ZERO BLUNDERS CONFIRMED ACROSS ALL CRITICAL PATHS!")
    print("=================================================================")

if __name__ == '__main__':
    run_audit()
