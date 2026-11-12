import io
import json
import urllib.parse
import server

class MockSocket:
    def __init__(self, request_bytes):
        self.rfile = io.BytesIO(request_bytes)
        self.wfile = io.BytesIO()

    def makefile(self, mode="r", *args, **kwargs):
        if "r" in mode:
            return self.rfile
        return self.wfile

    def sendall(self, data):
        self.wfile.write(data)

def execute_request(method, path, body=None, headers=None):
    if headers is None:
        headers = {}
    body_bytes = b""
    if body is not None:
        if isinstance(body, dict):
            body_bytes = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif isinstance(body, str):
            body_bytes = body.encode("utf-8")
        headers["Content-Length"] = str(len(body_bytes))

    header_lines = [f"{method} {path} HTTP/1.1", "Host: localhost"]
    for k, v in headers.items():
        header_lines.append(f"{k}: {v}")
    raw_req = "\r\n".join(header_lines).encode("utf-8") + b"\r\n\r\n" + body_bytes

    sock = MockSocket(raw_req)

    class DummyServer:
        pass

    try:
        handler = server.BabyHealthHandler(sock, ("127.0.0.1", 50000), DummyServer())
    except Exception:
        pass

    output = sock.wfile.getvalue().decode("utf-8", errors="ignore")
    parts = output.split("\r\n\r\n", 1)
    header_part = parts[0]
    body_part = parts[1] if len(parts) > 1 else ""

    first_line = header_part.splitlines()[0] if header_part else ""
    status_code = int(first_line.split()[1]) if ("HTTP/" in first_line and len(first_line.split()) > 1) else 200

    try:
        json_body = json.loads(body_part)
        return status_code, json_body
    except:
        return status_code, body_part

if __name__ == "__main__":
    print("--- TEST 1: Gateway Status (Zero-Cost Mode) ---")
    code, res = execute_request("GET", "/api/status")
    print(f"Status {code}: Mode={res['mode']}, Cost={res['costUgx']}")
    assert code == 200
    assert res["costUgx"] == 0
    assert "ZERO_COST" in res["mode"]
    print("✓ Test 1 Passed: Zero-cost mode verified!")

    print("\n--- TEST 2: Health Worker Sends Free SMS to Mother ---")
    send_body = {
        "to": "+256 778 501 066",
        "message": "Habari Amina! This is Sr. Sarah at Kagando Hospital. Your ANC Visit 3 is on Thursday 9:00 AM. Free Mama Kit will be issued.",
        "type": "ANC_REMINDER",
        "workerName": "Sr. Sarah Omondi (Midwife)"
    }
    code, res = execute_request("POST", "/api/sms/send", body=send_body)
    print(f"Status {code}: smsId={res['smsId']}, to={res['to']}, mother={res['motherName']}")
    assert code == 201
    assert res["success"] is True
    assert res["costUgx"] == 0
    assert res["motherName"] == "Amina Brenda"
    assert res["status"] == "DELIVERED"
    print("✓ Test 2 Passed: Health worker sent SMS successfully at 0 UGX!")

    print("\n--- TEST 3: Mother Replies to Health Worker via Inbound SMS ---")
    reply_body = {
        "from": "+256 778 501 066",
        "message": "Yes sister Sarah, I received the SMS. I will be at Kagando Hospital at 9 AM on Thursday."
    }
    code, res = execute_request("POST", "/api/sms/inbound", body=reply_body)
    print(f"Status {code}: inboundId={res['inboundId']}, mother={res['motherName']}, type={res['type']}")
    print(f"Auto-Reply: {res['reply']}")
    assert code == 200
    assert res["success"] is True
    assert res["motherName"] == "Amina Brenda"
    assert "Kagando Hospital" in res["reply"]
    print("✓ Test 3 Passed: Mother's reply successfully received & auto-acknowledged!")

    print("\n--- TEST 4: Mother Sends Emergency Danger Sign SMS ---")
    emerg_body = {
        "from": "+256 702 334 455", # Halima Kadogo
        "message": "HELP BLEEDING! Severe headache and vision blurred."
    }
    code, res = execute_request("POST", "/api/sms/inbound", body=emerg_body)
    print(f"Status {code}: isEmergency={res['isEmergency']}, reply={res['reply'][:60]}...")
    assert code == 200
    assert res["isEmergency"] is True
    assert "EMERGENCY" in res["reply"]
    print("✓ Test 4 Passed: Emergency danger sign triaged and flagged!")

    print("\n--- TEST 5: Two-Way Conversation History Endpoint ---")
    code, res = execute_request("GET", "/api/sms/conversation?phone=%2B256778501066")
    print(f"Status {code}: Total={res['count']}, Mother={res['motherName']}")
    assert code == 200
    assert res["count"] >= 2
    directions = set(m["direction"] for m in res["messages"])
    assert "OUTBOUND" in directions
    assert "INBOUND" in directions
    for msg in res["messages"][-4:]:
        print(f"  [{msg['direction']}] {msg.get('sender', msg.get('motherName'))}: {msg['message'][:65]}...")
    print("✓ Test 5 Passed: Two-way conversation history verified!")

    print("\n--- TEST 6: Interactive 2G USSD (*920#) Navigation ---")
    # 6a. Main menu
    code, res = execute_request("POST", "/api/ussd", body={"text": "", "phoneNumber": "+256778501066"})
    print("USSD Menu:\n" + res["response"])
    assert "Welcome to BabyHealth Guard" in res["response"]

    # 6b. ANC lookup
    code, res = execute_request("POST", "/api/ussd", body={"text": "2", "phoneNumber": "+256778501066"})
    print("\nUSSD ANC Response:\n" + res["response"])
    assert "Next ANC Clinic Appointment" in res["response"]
    assert "Amina Brenda" in res["response"]

    # 6c. Emergency Danger Sign USSD
    code, res = execute_request("POST", "/api/ussd", body={"text": "3*1", "phoneNumber": "+256778501066"})
    print("\nUSSD Danger Signs:\n" + res["response"])
    assert "EMERGENCY REPORTED" in res["response"]
    print("✓ Test 6 Passed: Interactive USSD *920# engine fully functional!")

    print("\n=======================================================")
    print("🎉 ALL 6 BACKEND & INTEGRATION TESTS 100% SUCCESSFUL!")
    print("ZERO REAL MONEY USED. TWO-WAY SMS & USSD ACTIVE.")
    print("=======================================================")
