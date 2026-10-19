import pytest

def test_upi_payment_reconciliation_and_receipt_download(client):
    # 1. Create a booking to test payment on
    company = client.get("/api/companies").get_json()[0]
    test_item = client.get(f"/api/tests?company_id={company['id']}").get_json()[0]

    b_res = client.post("/api/bookings", json={
        "company_id": company["id"],
        "test_id": test_item["id"],
        "patient_name": "Deepak Natarajan",
        "phone": "+91 9123456789",
        "collection_address": "45, Gandhi Street, T. Nagar, Chennai",
        "appointment_date": "2026-10-22",
        "appointment_slot": "08:00 AM - 09:00 AM"
    })
    booking_id = b_res.get_json()["booking_id"]

    # 2. View Payment screen details (exact payable amount, UPI ID, QR code)
    p_details = client.get(f"/api/bookings/{booking_id}/payment-details").get_json()
    assert p_details["payable_amount"] > 0
    assert "upi_id" in p_details
    assert p_details["payment_status"] == "unpaid"
    assert p_details["qr_code_image"].startswith("data:image/png;base64,")

    # 3. CRITICAL CHECK: Attempting to download PDF receipt before payment verification must be rejected
    receipt_res = client.get(f"/api/bookings/{booking_id}/receipt.pdf")
    assert receipt_res.status_code == 403
    assert "Receipt is only available after payment is verified as PAID" in receipt_res.get_json()["error"]

    # 4. Customer submits UPI Transaction Reference (UTR)
    test_utr = f"UPI{booking_id}987654321"
    sub_res = client.post(f"/api/bookings/{booking_id}/submit-payment", json={
        "transaction_reference": test_utr,
        "payment_method": "UPI"
    })
    assert sub_res.status_code == 200
    assert sub_res.get_json()["payment_status"] == "pending"

    # Attempting to download receipt while still 'pending' must still be blocked
    assert client.get(f"/api/bookings/{booking_id}/receipt.pdf").status_code == 403

    # 5. Authorised Admin verifies transaction reference & amount
    # Login as admin
    from db import connect
    from werkzeug.security import generate_password_hash
    with connect() as conn:
        conn.execute("UPDATE staff_users SET password_hash=? WHERE username='admin'", (generate_password_hash("AdminPass@2026"),))
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "AdminPass@2026", "role": "admin"})
    admin_token = login_res.get_json()["access_token"]

    verify_res = client.post(f"/api/admin/bookings/{booking_id}/verify-payment", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "action": "approve",
        "notes": "Verified in HDFC Bank laboratory account"
    })
    assert verify_res.status_code == 200
    assert verify_res.get_json()["payment_status"] == "paid"

    # 6. Verify duplicate payment prevention: Customer cannot resubmit payment for verified booking
    dup_res = client.post(f"/api/bookings/{booking_id}/submit-payment", json={
        "transaction_reference": test_utr,
        "payment_method": "UPI"
    })
    assert dup_res.status_code == 409
    assert "already been verified and marked as PAID" in dup_res.get_json()["error"]

    # 7. CRITICAL CHECK: Download official PDF receipt after payment verification
    pdf_res = client.get(f"/api/bookings/{booking_id}/receipt.pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.mimetype == "application/pdf"
    assert len(pdf_res.data) > 1000
    assert pdf_res.data[:4] == b"%PDF" # Valid PDF magic number header
