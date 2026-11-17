import sys
import os
import json

sys.path.append(os.path.join(os.path.dirname(__file__), "ml_service"))
from inference import BabyHealthPredictor
from train import generate_skin_sample, generate_eye_sample, generate_invalid_sample

def run_tests():
    print("=" * 65)
    print("  BABYHEALTH GUARD — NEONATAL VISION PIPELINE TEST SUITE")
    print("=" * 65)

    predictor = BabyHealthPredictor()

    test_cases = [
        ("Cutaneous Jaundice (Baby Skin)", generate_skin_sample("jaundice_skin"), "skin", "jaundice_skin", True),
        ("Healthy Newborn Skin", generate_skin_sample("healthy_skin"), "skin", "healthy_skin", False),
        ("Ophthalmia Neonatorum (Baby Eye)", generate_eye_sample("ophthalmia_neonatorum"), "eyes", "ophthalmia_neonatorum", True),
        ("Scleral Icterus / Eye Jaundice", generate_eye_sample("jaundice_sclera"), "eyes", "jaundice_sclera", True),
        ("Congenital Cataract / White Reflex", generate_eye_sample("leukocoria_cataract"), "eyes", "leukocoria_cataract", True),
        ("Non-Baby Image (Invalid Gatekeeper)", generate_invalid_sample(), "auto", "rejected", False),
    ]

    passed = 0
    for title, img, modality, expected_key, expected_danger in test_cases:
        res = predictor.predict(img, requested_modality=modality)
        print(f"\n[TEST CASE] {title}")

        if expected_key == "rejected":
            if res.get("status") == "rejected" and not res.get("is_newborn_valid"):
                print(f"  [PASS] Correctly rejected: {res.get('rejection_reason')} (Confidence: {res.get('confidence')}%)")
                print(f"  Message (Luganda): {res.get('message_luganda')}")
                passed += 1
            else:
                print(f"  [FAIL] Expected rejection, but got: {res}")
        else:
            cond_id = res.get("condition_id")
            conf = res.get("confidence")
            danger = res.get("danger_sign_triggered")
            sev = res.get("severity")

            if cond_id == expected_key:
                print(f"  [PASS] Predicted: {res.get('condition_name')} | Severity: {sev} | Confidence: {conf}%")
                print(f"  Danger Triggered: {danger} (Expected: {expected_danger})")
                print(f"  Local Guidance (Luganda): {res.get('translations', {}).get('luganda')[:90]}...")
                passed += 1
            else:
                print(f"  [FAIL] Expected {expected_key}, but got {cond_id} (Confidence: {conf}%)")

    print("\n" + "=" * 65)
    print(f"RESULTS: {passed}/{len(test_cases)} tests passed successfully!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
