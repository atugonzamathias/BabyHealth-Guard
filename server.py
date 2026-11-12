import http.server
import json
import os
import sys
import uuid
import urllib.parse
from datetime import datetime

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# In-memory mock database for live API interaction
MOTHERS = [
    {
        "id": "e4a2c1f0-9b8d-4f1e-9a1c-3b5d7e8f0a1b",
        "fullName": "Amina Brenda",
        "phoneNumber": "+256 778 501 066",
        "dateOfBirth": "1997-04-12",
        "facilityId": "Kagando Hospital",
        "gestationalWeeks": 28,
        "village": "Kagando Village",
        "emergencyContact": "+256 701 234 567",
        "ancStatus": "ANC 3 Due",
        "riskLevel": "NORMAL"
    },
    {
        "id": "b3f1a0e9-8c7b-4d0f-890b-2a4c6d7e9f0a",
        "fullName": "Halima Kadogo",
        "phoneNumber": "+256 702 334 455",
        "dateOfBirth": "1999-08-20",
        "facilityId": "Bwera Health Centre III",
        "gestationalWeeks": 34,
        "village": "Kayanja Landing",
        "emergencyContact": "+256 788 990 011",
        "ancStatus": "ANC 4 Scheduled",
        "riskLevel": "HIGH_BP"
    },
    {
        "id": "c5d3b2a1-0e9f-4b1a-987c-1b3d5e7f8a9b",
        "fullName": "Grace Mwangi",
        "phoneNumber": "+256 755 667 788",
        "dateOfBirth": "1995-11-03",
        "facilityId": "Kasese Municipal HC III",
        "gestationalWeeks": 22,
        "village": "Kasese Central",
        "emergencyContact": "+256 772 112 233",
        "ancStatus": "ANC 2 Complete",
        "riskLevel": "NORMAL"
    },
    {
        "id": "d6e4c3b2-1f0a-4c2b-891d-0a2c4e6f7b8c",
        "fullName": "Zainab Bello",
        "phoneNumber": "+256 782 445 566",
        "dateOfBirth": "1993-02-17",
        "facilityId": "Kilembe Mines Hospital",
        "gestationalWeeks": 38,
        "village": "Kilembe Valley",
        "emergencyContact": "+256 700 889 900",
        "ancStatus": "Delivery Prep",
        "riskLevel": "KMC_CANDIDATE"
    }
]

VITALS = [
    {
        "id": str(uuid.uuid4()),
        "motherId": "e4a2c1f0-9b8d-4f1e-9a1c-3b5d7e8f0a1b",
        "systolicBp": 118,
        "diastolicBp": 76,
        "weightKg": 64.5,
        "recordedAt": datetime.now().isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "motherId": "b3f1a0e9-8c7b-4d0f-890b-2a4c6d7e9f0a",
        "systolicBp": 146,
        "diastolicBp": 96,
        "weightKg": 69.0,
        "recordedAt": datetime.now().isoformat()
    }
]

APPOINTMENTS = [
    {
        "id": str(uuid.uuid4()),
        "motherId": "e4a2c1f0-9b8d-4f1e-9a1c-3b5d7e8f0a1b",
        "type": "ANC Visit 3",
        "scheduledAt": "2026-11-14T09:00:00",
        "status": "SCHEDULED",
        "facility": "Kagando Hospital"
    },
    {
        "id": str(uuid.uuid4()),
        "motherId": "b3f1a0e9-8c7b-4d0f-890b-2a4c6d7e9f0a",
        "type": "ANC Visit 4 (BP Monitoring)",
        "scheduledAt": "2026-11-16T10:30:00",
        "status": "CONFIRMED",
        "facility": "Bwera Health Centre III"
    }
]

USERS = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "nurse@babyhealth.local",
        "role": "NURSE",
        "fullName": "Sr. Sarah Omondi",
        "title": "Facility Nurse & Midwife",
        "facilityId": "Kagando Hospital"
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "email": "midwife@babyhealth.local",
        "role": "MIDWIFE",
        "fullName": "Mary Wambui",
        "title": "Certified Community Midwife",
        "facilityId": "Bwera Health Centre III"
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "email": "doctor@babyhealth.local",
        "role": "DOCTOR",
        "fullName": "Dr. Anthony Karanja",
        "title": "Obstetrician & Gynaecologist",
        "facilityId": "Kasese Municipal Hospital"
    },
    {
        "id": "44444444-4444-4444-4444-444444444444",
        "email": "admin@babyhealth.local",
        "role": "ADMIN",
        "fullName": "Admin Coordinator",
        "title": "Uganda MoH District Supervisor",
        "facilityId": "Kasese District Health Office"
    }
]

# Helpers for phone normalization and mother lookup
def normalize_phone(phone):
    if not phone:
        return ""
    cleaned = "".join(c for c in str(phone) if c.isdigit() or c == "+")
    if cleaned.startswith("0") and len(cleaned) == 10:
        cleaned = "+256" + cleaned[1:]
    elif cleaned.startswith("256") and not cleaned.startswith("+"):
        cleaned = "+" + cleaned
    return cleaned

def find_mother(identifier):
    if not identifier:
        return None
    raw = str(identifier).strip()
    norm = normalize_phone(raw)
    for m in MOTHERS:
        if m.get("id") == raw:
            return m
        if norm:
            m_phone = normalize_phone(m.get("phoneNumber"))
            if m_phone == norm or (len(norm) >= 9 and m_phone.endswith(norm[-9:])):
                return m
        if m.get("fullName", "").lower() == raw.lower():
            return m
    return None

# Real-time SMS Delivery Outbox / Inbox Log (Simulated Telecom GSM Gateway - Zero Money Consumed)
SMS_LOGS = [
    {
        "id": "sms-1005",
        "to": "BABYGUARD",
        "from": "+256 778 501 066",
        "motherName": "Amina Brenda",
        "direction": "INBOUND",
        "message": "Thank you Sr. Sarah! I will come on Thursday at 9:00 AM for ANC 3. Baby kicked 12 times this morning.",
        "type": "APPOINTMENT_CONFIRMED",
        "status": "RECEIVED",
        "unread": False,
        "costUgx": 0,
        "timestamp": "2026-11-11 10:15:30"
    },
    {
        "id": "sms-1004",
        "to": "+256 778 501 066",
        "from": "BABYGUARD",
        "motherName": "Amina Brenda",
        "sender": "Sr. Sarah Omondi (Midwife)",
        "direction": "OUTBOUND",
        "message": "Habari Amina! This is Sr. Sarah at Kagando Hospital. Your ANC Visit 3 is scheduled for Thursday 24 Oct, 9:00 AM. Free Mama Kit will be issued. Please confirm attendance.",
        "type": "ANC_REMINDER",
        "status": "DELIVERED",
        "costUgx": 0,
        "timestamp": "2026-11-11 09:45:10"
    },
    {
        "id": "sms-1003",
        "to": "BABYGUARD",
        "from": "+256 702 334 455",
        "motherName": "Halima Kadogo",
        "direction": "INBOUND",
        "message": "Midwife, my head aches severely and vision is slightly blurry. Should I come to Bwera HC right away?",
        "type": "EMERGENCY_REPLY",
        "status": "RECEIVED",
        "unread": True,
        "costUgx": 0,
        "timestamp": "2026-11-11 09:25:00"
    },
    {
        "id": "sms-1002",
        "to": "+256 702 334 455",
        "from": "BABYGUARD",
        "motherName": "Halima Kadogo",
        "sender": "Sr. Sarah Omondi (Midwife)",
        "direction": "OUTBOUND",
        "message": "🚨 URGENT: Halima, stay resting. We received your report of severe headache. Sr. Sarah flagged your profile as High BP triage. Midwife & VHT boda dispatched.",
        "type": "EMERGENCY_DISPATCH",
        "status": "DELIVERED",
        "costUgx": 0,
        "timestamp": "2026-11-11 09:26:15"
    },
    {
        "id": "sms-1001",
        "to": "+256 782 445 566",
        "from": "BABYGUARD",
        "motherName": "Zainab Bello",
        "sender": "Sr. Sarah Omondi (Midwife)",
        "direction": "OUTBOUND",
        "message": "Habari Zainab! Kangaroo Mother Care reminder: Practice skin-to-skin warmth for 8+ continuous hours daily to prevent infant hypothermia.",
        "type": "KMC_GUIDANCE",
        "status": "DELIVERED",
        "costUgx": 0,
        "timestamp": "2026-11-11 08:30:15"
    }
]

class BabyHealthHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _read_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            return self.rfile.read(content_length).decode("utf-8")
        return ""

    def _read_json(self):
        body = self._read_body()
        if body:
            try:
                return json.loads(body)
            except Exception:
                try:
                    # Fallback for url-encoded form body (e.g. Africa's Talking USSD / SMS)
                    parsed = urllib.parse.parse_qs(body)
                    return {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
                except Exception:
                    return {}
        return {}

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

    def _send_text(self, text, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(text.encode("utf-8"))

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # Redirect root /frontend or /frontend/ to frontend/index.html
        if path in ("/frontend", "/frontend/"):
            self.send_response(302)
            self.send_header("Location", "/frontend/index.html")
            self.end_headers()
            return

        # API Handlers
        if path == "/api/auth/me":
            self._send_json(USERS[0])
            return
        elif path == "/api/auth/users":
            self._send_json(USERS)
            return
        elif path == "/api/mothers":
            self._send_json(MOTHERS)
            return
        elif path.startswith("/api/mothers/"):
            mid = path.replace("/api/mothers/", "")
            for m in MOTHERS:
                if m["id"] == mid:
                    self._send_json(m)
                    return
            self._send_json({"error": "Not found"}, 404)
            return
        elif path == "/api/vitals":
            self._send_json(VITALS)
            return
        elif path.startswith("/api/vitals/mother/"):
            mid = path.replace("/api/vitals/mother/", "")
            history = [v for v in VITALS if v["motherId"] == mid]
            self._send_json(history)
            return
        elif path == "/api/appointments":
            self._send_json(APPOINTMENTS)
            return
        elif path == "/api/sms/logs":
            # Support optional filtering by phone, type, direction
            results = list(SMS_LOGS)
            filter_phone = query_params.get("phone", [None])[0]
            filter_type = query_params.get("type", [None])[0]
            filter_dir = query_params.get("direction", [None])[0]
            if filter_phone:
                np = normalize_phone(filter_phone)
                results = [s for s in results if normalize_phone(s.get("to")) == np or normalize_phone(s.get("from")) == np]
            if filter_type:
                results = [s for s in results if s.get("type") == filter_type]
            if filter_dir:
                results = [s for s in results if s.get("direction") == filter_dir.upper()]
            self._send_json(results)
            return
        elif path == "/api/sms/conversation":
            phone = query_params.get("phone", [None])[0]
            mother_id = query_params.get("motherId", [None])[0]
            mother = find_mother(mother_id or phone)
            target_phone = normalize_phone(mother["phoneNumber"] if mother else phone)
            
            thread = []
            marked_read_count = 0
            for s in SMS_LOGS:
                is_match = False
                if target_phone:
                    if normalize_phone(s.get("to")) == target_phone or normalize_phone(s.get("from")) == target_phone:
                        is_match = True
                elif mother and (s.get("motherId") == mother.get("id") or s.get("motherName") == mother.get("fullName")):
                    is_match = True

                if is_match:
                    if s.get("direction") == "INBOUND" and s.get("unread", False):
                        s["unread"] = False
                        marked_read_count += 1
                    thread.append(s)

            # Sort chronological (oldest first for dialogue display)
            thread_sorted = sorted(thread, key=lambda x: x.get("timestamp", ""))
            self._send_json({
                "mother": mother,
                "phoneNumber": target_phone or (mother["phoneNumber"] if mother else ""),
                "motherName": mother["fullName"] if mother else "Expectant Mother",
                "messages": thread_sorted,
                "count": len(thread_sorted),
                "unreadMarked": marked_read_count
            })
            return
        elif path == "/api/sms/unread":
            unreads = [s for s in SMS_LOGS if s.get("direction") == "INBOUND" and s.get("unread", False)]
            self._send_json({
                "unreadCount": len(unreads),
                "unreads": unreads
            })
            return
        elif path == "/api/status":
            unreads = len([s for s in SMS_LOGS if s.get("direction") == "INBOUND" and s.get("unread", False)])
            self._send_json({
                "status": "UP",
                "service": "BabyHealth Guard Uganda SMS/USSD Gateway",
                "mode": "ZERO_COST_TELECOM_SANDBOX (MTN & Airtel Uganda)",
                "costUgx": 0,
                "billingNotice": "Sandbox Mode Active: Real money disabled, all SMS & USSD are free",
                "ussdCode": "*920#",
                "totalSmsLogged": len(SMS_LOGS),
                "unreadRepliesCount": unreads,
                "timestamp": datetime.now().isoformat()
            })
            return

        # Static file handling (defaults to SimpleHTTPRequestHandler)
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        data = self._read_json()

        if path in ("/api/auth/login", "/api/auth/register"):
            email = data.get("email", "nurse@babyhealth.local")
            matched = next((u for u in USERS if u["email"].lower() == email.lower()), USERS[0])
            self._send_json({
                "token": "demo-jwt-token-" + str(uuid.uuid4())[:8],
                "role": matched["role"],
                "email": matched["email"],
                "fullName": matched["fullName"],
                "title": matched["title"],
                "facilityId": matched["facilityId"]
            })
            return

        elif path == "/api/mothers":
            new_mother = {
                "id": str(uuid.uuid4()),
                "fullName": data.get("fullName", "New Expectant Mother"),
                "phoneNumber": data.get("phoneNumber", "+256 700 000 000"),
                "dateOfBirth": data.get("dateOfBirth", "1998-01-01"),
                "facilityId": data.get("facilityId", "Kagando Hospital"),
                "gestationalWeeks": data.get("gestationalWeeks", 20),
                "village": data.get("village", "Kagando Village"),
                "emergencyContact": data.get("emergencyContact", "+256 701 234 567"),
                "ancStatus": "Registered via Portal",
                "riskLevel": "NORMAL"
            }
            MOTHERS.insert(0, new_mother)

            # Auto-dispatch registration welcome SMS
            sms_record = {
                "id": "sms-" + str(uuid.uuid4())[:8],
                "to": new_mother["phoneNumber"],
                "from": "BABYGUARD",
                "direction": "OUTBOUND",
                "message": f"Welcome {new_mother['fullName']} to BabyHealth Guard! Your ANC care profile is registered at {new_mother['facilityId']}. Dial *920# anytime for free support.",
                "type": "REGISTRATION_CONFIRMATION",
                "status": "DELIVERED",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            SMS_LOGS.insert(0, sms_record)

            self._send_json(new_mother, 201)
            return

        elif path == "/api/vitals":
            new_vital = {
                "id": str(uuid.uuid4()),
                "motherId": data.get("motherId"),
                "systolicBp": data.get("systolicBp", 120),
                "diastolicBp": data.get("diastolicBp", 80),
                "weightKg": data.get("weightKg", 65.0),
                "recordedAt": datetime.now().isoformat()
            }
            VITALS.insert(0, new_vital)
            self._send_json(new_vital, 201)
            return

        elif path == "/api/appointments":
            new_appt = {
                "id": str(uuid.uuid4()),
                "motherId": data.get("motherId"),
                "type": data.get("type", "ANC"),
                "scheduledAt": data.get("scheduledAt", datetime.now().isoformat()),
                "status": "SCHEDULED",
                "facility": data.get("facility", "Kagando Hospital")
            }
            APPOINTMENTS.insert(0, new_appt)

            # Find mother to send SMS
            mother = next((m for m in MOTHERS if m["id"] == new_appt["motherId"]), MOTHERS[0])
            sms_record = {
                "id": "sms-" + str(uuid.uuid4())[:8],
                "to": mother["phoneNumber"],
                "from": "BABYGUARD",
                "direction": "OUTBOUND",
                "message": f"Reminder: Your appointment ({new_appt['type']}) at {new_appt['facility']} is set for {new_appt['scheduledAt'][:10]}. Free Mama Kit available.",
                "type": "APPOINTMENT_SCHEDULED",
                "status": "DELIVERED",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            SMS_LOGS.insert(0, sms_record)

            self._send_json(new_appt, 201)
            return

        # Direct SMS Send Endpoint (/api/sms/send)
        elif path == "/api/sms/send":
            to_val = data.get("to", "+256 778 501 066")
            message_text = data.get("message", "BabyHealth Guard clinical notification.").strip()
            msg_type = data.get("type", "CLINICAL_DISPATCH")
            worker_name = data.get("workerName", "Sr. Sarah Omondi (Midwife)")
            
            # Match mother if possible
            mother = find_mother(to_val) or find_mother(data.get("motherId"))
            target_phone = mother["phoneNumber"] if mother else to_val
            target_name = mother["fullName"] if mother else "Expectant Mother"
            
            sms_id = "sms-" + str(uuid.uuid4())[:8]
            sms_record = {
                "id": sms_id,
                "to": target_phone,
                "from": "BABYGUARD",
                "motherName": target_name,
                "motherId": mother["id"] if mother else None,
                "sender": worker_name,
                "direction": "OUTBOUND",
                "message": message_text,
                "type": msg_type,
                "status": "DELIVERED",
                "costUgx": 0,  # Zero-cost for rural mother & facility in sandbox
                "network": "MTN Uganda / Airtel Uganda GSM Gateway",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            SMS_LOGS.insert(0, sms_record)
            self._send_json({
                "success": True,
                "smsId": sms_id,
                "sms": sms_record,
                "to": target_phone,
                "motherName": target_name,
                "costUgx": 0,
                "balanceUgx": "Unlimited Free MoH Sandbox",
                "status": "DELIVERED",
                "network": "MTN Uganda / Airtel Uganda GSM Gateway",
                "timestamp": sms_record["timestamp"]
            }, 201)
            return

        # Inbound SMS Receiver (/api/sms/inbound) - Mother replying or sending SMS
        elif path == "/api/sms/inbound":
            from_phone = data.get("from") or data.get("phoneNumber") or data.get("from_phone") or "+256 778 501 066"
            raw_text = (data.get("message") or data.get("text") or "").strip()
            if not raw_text:
                raw_text = "Habari Sr. Sarah, received your message."
            upper_text = raw_text.upper()

            mother = find_mother(from_phone)
            mother_name = mother["fullName"] if mother else f"Mother ({from_phone})"
            mother_id = mother["id"] if mother else None

            # Intelligent triage and categorization
            msg_type = "PATIENT_REPLY"
            auto_reply = ""
            is_emergency = False

            if any(k in upper_text for k in ["HELP", "EMERGENCY", "BLEED", "PAIN", "FEVER", "HEADACHE", "BLUR", "CONVULS", "WATER"]):
                msg_type = "EMERGENCY_REPLY"
                is_emergency = True
                if mother:
                    mother["riskLevel"] = "CRITICAL_EMERGENCY"
                auto_reply = f"🚨 EMERGENCY ALERT: Stay calm {mother_name}. Call toll-free 112 or 0800 100 200 immediately. Midwife Sr. Sarah at Kagando Hospital has received your alert. Keep resting in lateral position."
            elif any(k in upper_text for k in ["YES", "CONFIRM", "COMING", "ATTEND", "SURE", "OK"]):
                msg_type = "APPOINTMENT_CONFIRMED"
                if mother:
                    for appt in APPOINTMENTS:
                        if appt.get("motherId") == mother["id"]:
                            appt["status"] = "CONFIRMED"
                auto_reply = f"Thank you {mother_name}! Your ANC clinic visit confirmation is recorded at {mother['facilityId'] if mother else 'Kagando Hospital'}. Free Mama Kit will be issued. Dial *920# anytime."
            elif any(k in upper_text for k in ["RESCHEDULE", "CHANGE", "LATER", "CANNOT", "POSTPONE"]):
                msg_type = "RESCHEDULE_REQUEST"
                auto_reply = f"Noted {mother_name}. Your request to reschedule has reached Midwife Sr. Sarah. You will receive an SMS with an updated clinic date. Dial *920# to view available slots."
            elif any(k in upper_text for k in ["ANC", "DATE", "VISIT", "WHEN"]):
                msg_type = "ANC_QUERY"
                auto_reply = f"Habari {mother_name}! Next ANC clinic is Thursday 9:00 AM at {mother['facilityId'] if mother else 'Kagando Hospital'} with Sr. Sarah. Bring your Antenatal Card. Dial *920# for boda transport."
            elif any(k in upper_text for k in ["KICK", "MOVEMENT", "BABY"]):
                msg_type = "FETAL_MOVEMENT_QUERY"
                auto_reply = "Fetal Movement Guide: Normal is 10+ kicks in 2 hours after meals. If fewer than 10 kicks, visit Kagando HC III or call +256 778 501 066."
            elif any(k in upper_text for k in ["KMC", "WARM", "BREASTFEED", "MILK"]):
                msg_type = "KMC_QUERY"
                auto_reply = "KMC Newborn: Practice skin-to-skin warmth at least 8 hours daily. Exclusive breastfeeding every 2-3 hours protects against hypothermia. No tea or water."
            else:
                auto_reply = f"BabyHealth Guard Uganda: Thank you {mother_name}! Midwife Sr. Sarah Omondi at Kagando Hospital has received your reply: \"{raw_text}\". She will follow up promptly. For emergency help dial *920# or call 112."

            # Log inbound SMS
            inbound_id = "sms-" + str(uuid.uuid4())[:8]
            inbound_record = {
                "id": inbound_id,
                "to": "BABYGUARD",
                "from": from_phone,
                "motherName": mother_name,
                "motherId": mother_id,
                "direction": "INBOUND",
                "message": raw_text,
                "type": msg_type,
                "status": "RECEIVED",
                "unread": True,
                "costUgx": 0,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            SMS_LOGS.insert(0, inbound_record)

            # Automated SMS confirmation back to mother (Zero-cost)
            outbound_id = "sms-" + str(uuid.uuid4())[:8]
            outbound_record = {
                "id": outbound_id,
                "to": from_phone,
                "from": "BABYGUARD",
                "motherName": mother_name,
                "motherId": mother_id,
                "sender": "BabyHealth Automated Dispatch",
                "direction": "OUTBOUND",
                "message": auto_reply,
                "type": "AUTO_REPLY",
                "status": "DELIVERED",
                "costUgx": 0,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            SMS_LOGS.insert(0, outbound_record)

            # If emergency, also record a clinical alert notification for health worker
            if is_emergency:
                alert_id = "sms-" + str(uuid.uuid4())[:8]
                SMS_LOGS.insert(0, {
                    "id": alert_id,
                    "to": "+256 778 501 066",
                    "from": "BABYGUARD",
                    "motherName": mother_name,
                    "motherId": mother_id,
                    "sender": "Triage Alert Engine",
                    "direction": "OUTBOUND",
                    "message": f"🚨 RED TRIAGE ALERT: Inbound emergency SMS from {mother_name} ({from_phone}): \"{raw_text}\". Immediate clinical follow-up required!",
                    "type": "MIDWIFE_ALERT",
                    "status": "DELIVERED",
                    "costUgx": 0,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })

            self._send_json({
                "success": True,
                "inboundId": inbound_id,
                "motherName": mother_name,
                "type": msg_type,
                "isEmergency": is_emergency,
                "reply": auto_reply,
                "timestamp": inbound_record["timestamp"]
            }, 200)
            return

        # Mark SMS as Read (/api/sms/mark-read)
        elif path == "/api/sms/mark-read":
            sms_id = data.get("id")
            phone = data.get("phone")
            mark_all = data.get("all", False)
            norm_phone = normalize_phone(phone) if phone else None
            count = 0
            for s in SMS_LOGS:
                if s.get("direction") == "INBOUND" and s.get("unread", False):
                    if mark_all or (sms_id and s.get("id") == sms_id) or (norm_phone and normalize_phone(s.get("from")) == norm_phone):
                        s["unread"] = False
                        count += 1
            self._send_json({"success": True, "markedCount": count}, 200)
            return

        # Bulk SMS Broadcast for ANC clinics (/api/sms/broadcast)
        elif path == "/api/sms/broadcast":
            campaign = data.get("campaign", "ANC Reminder Broadcast")
            dispatched = 0
            for m in MOTHERS:
                sms_id = "sms-" + str(uuid.uuid4())[:8]
                msg = f"Hello {m['fullName']}, BabyHealth Guard reminder: Your ANC visit is approaching at {m['facilityId']}. Free Mama Kits and check-ups are available. Dial *920#."
                SMS_LOGS.insert(0, {
                    "id": sms_id,
                    "to": m["phoneNumber"],
                    "from": "BABYGUARD",
                    "motherName": m["fullName"],
                    "motherId": m["id"],
                    "sender": "Sr. Sarah Omondi (Broadcast)",
                    "direction": "OUTBOUND",
                    "message": msg,
                    "type": "BROADCAST_ANC",
                    "status": "DELIVERED",
                    "costUgx": 0,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
                dispatched += 1
            self._send_json({"success": True, "campaign": campaign, "dispatchedCount": dispatched}, 200)
            return

        # Telecom Standard USSD Gateway (*920#)
        elif path == "/api/ussd":
            # Handles Africa's Talking, MTN, Airtel, and Web-based USSD simulators
            session_id = data.get("sessionId", str(uuid.uuid4())[:8])
            service_code = data.get("serviceCode", "*920#")
            phone_number = data.get("phoneNumber", "+256 778 501 066")
            text = data.get("text", "").strip()

            response_msg = self._process_ussd_menu(text, phone_number, session_id)
            
            # Support both Africa's Talking plain text ('CON ...' / 'END ...') and JSON response
            accept = self.headers.get("Accept", "")
            if "text/plain" in accept or "application/x-www-form-urlencoded" in self.headers.get("Content-Type", ""):
                self._send_text(response_msg)
            else:
                self._send_json({
                    "response": response_msg,
                    "sessionId": session_id,
                    "phoneNumber": phone_number,
                    "serviceCode": service_code
                })
            return

        self._send_json({"error": "Not found"}, 404)

    def _process_ussd_menu(self, text, phone_number, session_id):
        """
        Interactive Multi-Level USSD Engine (*920#)
        Supports:
        1. Pregnancy Registration (Auto-syncs to Database & sends SMS)
        2. ANC Clinic Appointments & Reminders
        3. Emergency Danger Signs Triage (Instant VHT Dispatch & SMS)
        4. Newborn Check & Kangaroo Mother Care (KMC)
        5. Mama Kit & Transport Voucher
        6. Language Switcher (Luganda, Runyankole, Acholi, Swahili, English)
        """
        clean_text = text.replace("*920#", "").replace("920#", "").replace("*920", "").strip("*").strip()
        parts = [p.strip() for p in clean_text.split("*")] if clean_text else []
        if parts and parts[0] in ("920", "*920"):
            parts = parts[1:]

        # Handle '0' or '00' to return to Main Menu
        if parts and parts[-1] in ("0", "00"):
            parts = []

        # LEVEL 0: Main Menu
        if not parts:
            return (
                "CON Welcome to BabyHealth Guard Uganda (*920#)\n"
                "1. Register Pregnancy (Maama)\n"
                "2. Next ANC Clinic Visit\n"
                "3. Report Danger Signs (Emergency 🚨)\n"
                "4. Newborn & Kangaroo Care (KMC)\n"
                "5. Mama Kit & Transport Voucher\n"
                "6. Change Language / Olulimi"
            )

        main_choice = parts[0]

        # -------------------------------------------------------------
        # 1. PREGNANCY REGISTRATION
        # -------------------------------------------------------------
        if main_choice == "1":
            if len(parts) == 1:
                return "CON Enter Mother's Full Name (e.g. Amina Brenda):"
            elif len(parts) == 2:
                name = parts[1]
                return f"CON Welcome {name}.\nEnter Gestational Age in Weeks (e.g. 24):"
            elif len(parts) == 3:
                return (
                    "CON Select your District / Village:\n"
                    "1. Kagando Village (Kasese)\n"
                    "2. Bwera Outpost\n"
                    "3. Kasese Central\n"
                    "4. Other Village"
                )
            elif len(parts) == 4:
                name = parts[1]
                weeks = parts[2]
                village_map = {"1": "Kagando Village", "2": "Bwera Outpost", "3": "Kasese Central", "4": "Rural Outpost"}
                village = village_map.get(parts[3], "Uganda Village")
                
                # Auto-register into database
                new_m = {
                    "id": str(uuid.uuid4()),
                    "fullName": name,
                    "phoneNumber": phone_number,
                    "dateOfBirth": "1998-05-10",
                    "facilityId": "Kagando Hospital" if "Kagando" in village else "Bwera HC III",
                    "gestationalWeeks": int(weeks) if weeks.isdigit() else 20,
                    "village": village,
                    "emergencyContact": "+256 701 234 567",
                    "ancStatus": "ANC 1 Booked via USSD",
                    "riskLevel": "NORMAL"
                }
                MOTHERS.insert(0, new_m)

                # Send Confirmation SMS
                confirm_sms = {
                    "id": "sms-" + str(uuid.uuid4())[:8],
                    "to": phone_number,
                    "from": "BABYGUARD",
                    "direction": "OUTBOUND",
                    "message": f"Congratulations {name}! You are registered with BabyHealth Guard at {new_m['facilityId']}. Your ANC 1 is booked. Dial *920# anytime for free checks.",
                    "type": "USSD_REGISTRATION",
                    "status": "DELIVERED",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                SMS_LOGS.insert(0, confirm_sms)

                return (
                    f"END Registration Successful!\n"
                    f"Name: {name} ({weeks}w)\n"
                    f"Facility: {new_m['facilityId']}\n"
                    f"Confirmation SMS sent to {phone_number}. Thank you!"
                )

        # -------------------------------------------------------------
        # 2. NEXT ANC CLINIC VISIT
        # -------------------------------------------------------------
        elif main_choice == "2":
            mother = next((m for m in MOTHERS if m["phoneNumber"].replace(" ", "") == phone_number.replace(" ", "")), MOTHERS[0])
            
            # Send immediate SMS reminder
            reminder_sms = {
                "id": "sms-" + str(uuid.uuid4())[:8],
                "to": phone_number,
                "from": "BABYGUARD",
                "direction": "OUTBOUND",
                "message": f"ANC Date: Thursday 24 Oct, 9:00 AM at {mother['facilityId']} with Sr. Sarah Omondi. Free Mama Kit will be provided. Dial *920# for transport voucher.",
                "type": "ANC_USSD_LOOKUP",
                "status": "DELIVERED",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            SMS_LOGS.insert(0, reminder_sms)

            return (
                f"END Next ANC Clinic Appointment:\n"
                f"Mother: {mother['fullName']}\n"
                f"Stage: {mother['gestationalWeeks']} Weeks\n"
                f"Date: Thursday 24 Oct, 09:00 AM\n"
                f"Facility: {mother['facilityId']}\n"
                f"Midwife: Sr. Sarah Omondi\n"
                f"Details sent via free SMS."
            )

        # -------------------------------------------------------------
        # 3. EMERGENCY DANGER SIGNS TRIAGE
        # -------------------------------------------------------------
        elif main_choice == "3":
            if len(parts) == 1:
                return (
                    "CON 🚨 EMERGENCY TRIAGE (*920#):\n"
                    "Select symptom immediately:\n"
                    "1. Vaginal Bleeding\n"
                    "2. Severe Headache / Blurred Vision\n"
                    "3. Baby Stopped Moving / Kicking\n"
                    "4. High Fever & Chills (Malaria)\n"
                    "5. Water Broken (Premature)"
                )
            elif len(parts) == 2:
                danger_map = {
                    "1": "Vaginal Bleeding",
                    "2": "Severe Headache / Blurred Vision",
                    "3": "Baby Stopped Moving / Decreased Kicks",
                    "4": "High Fever & Chills",
                    "5": "Premature Water Broken"
                }
                selected_sign = danger_map.get(parts[1], "Acute Maternal Danger Sign")
                
                # Find or assign mother
                mother = next((m for m in MOTHERS if m["phoneNumber"].replace(" ", "") == phone_number.replace(" ", "")), MOTHERS[0])
                mother["riskLevel"] = "CRITICAL_EMERGENCY"

                # 1. Urgent SMS to Mother
                SMS_LOGS.insert(0, {
                    "id": "sms-" + str(uuid.uuid4())[:8],
                    "to": phone_number,
                    "from": "BABYGUARD",
                    "direction": "OUTBOUND",
                    "message": f"🚨 EMERGENCY: Midwife Sr. Sarah and Village Health Team (VHT) are notified for {selected_sign}. An emergency Boda voucher has been approved. Call 112 if condition worsens.",
                    "type": "EMERGENCY_DISPATCH",
                    "status": "DELIVERED",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })

                # 2. Urgent SMS to Midwife
                SMS_LOGS.insert(0, {
                    "id": "sms-" + str(uuid.uuid4())[:8],
                    "to": "+256 778 501 066",
                    "from": "BABYGUARD",
                    "direction": "OUTBOUND",
                    "message": f"🚨 RED TRIAGE ALERT: Mother {mother['fullName']} ({phone_number}) at {mother['village']} reported {selected_sign}. Immediate clinical response required!",
                    "type": "MIDWIFE_ALERT",
                    "status": "DELIVERED",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })

                return (
                    f"END 🚨 EMERGENCY REPORTED!\n"
                    f"Sign: {selected_sign}\n"
                    f"Midwife Sr. Sarah & VHT are dispatched to {mother['village']}.\n"
                    f"Call Toll-Free 112 or 0800 100 200 now for ambulance."
                )

        # -------------------------------------------------------------
        # 4. NEWBORN & KANGAROO MOTHER CARE (KMC)
        # -------------------------------------------------------------
        elif main_choice == "4":
            if len(parts) == 1:
                return (
                    "CON Newborn & Kangaroo Care (*920#):\n"
                    "1. Log Kangaroo Skin-to-Skin Hours\n"
                    "2. Exclusive Breastfeeding Guide\n"
                    "3. Check Immunization (UNEPI)\n"
                    "4. Newborn Danger Signs"
                )
            elif len(parts) == 2:
                sub = parts[1]
                if sub == "1":
                    return "CON Enter hours of Kangaroo Skin-to-Skin care done today (e.g. 8):"
                elif sub == "2":
                    return (
                        "END Exclusive Breastfeeding:\n"
                        "Feed colostrum within 1st hour.\n"
                        "Nurse 8-12 times day and night.\n"
                        "No water, cow milk, or tea for first 6 months. Colostrum is baby's 1st vaccine!"
                    )
                elif sub == "3":
                    return (
                        "END Uganda UNEPI Immunization:\n"
                        "At Birth: BCG (Tuberculosis) + OPV 0 (Polio)\n"
                        "6 Weeks: Pentavalent 1, PCV 1, Rota 1\n"
                        "10 Weeks: Pentavalent 2, PCV 2, Rota 2\n"
                        "Cord: Apply 7.1% Chlorhexidine gel daily."
                    )
                elif sub == "4":
                    return (
                        "END Newborn Danger Signs:\n"
                        "- Inability to suckle/feed\n"
                        "- Body feels very hot or cold\n"
                        "- Fast breathing / chest drawing in\n"
                        "- Pus from umbilical cord\n"
                        "Visit Kagando Hospital or call 112 immediately."
                    )
            elif len(parts) == 3 and parts[1] == "1":
                hours = parts[2]
                return (
                    f"END Kangaroo Care Logged: {hours} hours!\n"
                    f"Target is 8+ hours continuous skin-to-skin daily for optimal infant warmth and growth. Well done Mama!"
                )

        # -------------------------------------------------------------
        # 5. MAMA KIT & TRANSPORT VOUCHER
        # -------------------------------------------------------------
        elif main_choice == "5":
            mother = next((m for m in MOTHERS if m["phoneNumber"].replace(" ", "") == phone_number.replace(" ", "")), MOTHERS[0])
            return (
                f"END Mama Kit & Transport Voucher:\n"
                f"Mother: {mother['fullName']}\n"
                f"Mama Kit: APPROVED (Clean delivery pack, sterile gloves, razor, gauze, cord ties, mackintosh sheet)\n"
                f"Transport Voucher: 10,000 UGX (Boda Subsidy)\n"
                f"Redeem at {mother['facilityId']} Pharmacy."
            )

        # -------------------------------------------------------------
        # 6. LANGUAGE SWITCHER
        # -------------------------------------------------------------
        elif main_choice == "6":
            if len(parts) == 1:
                return (
                    "CON Londa Olulimi lwo / Choose Language:\n"
                    "1. English\n"
                    "2. Luganda\n"
                    "3. Runyankole / Rukiga\n"
                    "4. Acholi\n"
                    "5. Kiswahili"
                )
            elif len(parts) == 2:
                lang_map = {"1": "English", "2": "Luganda", "3": "Runyankole/Rukiga", "4": "Acholi", "5": "Kiswahili"}
                chosen = lang_map.get(parts[1], "English")
                return f"END Olulimi lukyusiddwa mu {chosen}.\nDial *920# again to access services in your language. Webale!"

        return "END Invalid option. Dial *920# to try again."

if __name__ == "__main__":
    import threading
    import time
    import webbrowser

    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    server_address = ("0.0.0.0", port)
    httpd = http.server.HTTPServer(server_address, BabyHealthHandler)
    print("=" * 68, flush=True)
    print("🏥 BabyHealth Guard — Digital Maternal & Newborn Healthcare Platform", flush=True)
    print("📡 Telecom Gateway: 2G USSD (*920#) & Live Two-Way SMS Active", flush=True)
    print("💰 Billing Engine: ZERO-COST SANDBOX (MTN & Airtel Uganda • 0 UGX)", flush=True)
    print(f"🌐 Health Worker Dashboard: http://localhost:{port}/frontend/index.html", flush=True)
    print(f"🌐 Public Landing Portal:   http://localhost:{port}/", flush=True)
    print("=" * 68, flush=True)
    print("Opening browser automatically... Press Ctrl+C to stop.\n", flush=True)

    def auto_open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open(f"http://localhost:{port}/frontend/index.html")
        except Exception:
            pass

    threading.Thread(target=auto_open_browser, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down BabyHealth Guard server.", flush=True)
