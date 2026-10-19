import pytest

def test_immutable_booking_snapshot_and_price_stability(client):
    # 1. Fetch Apollo and CBC test
    apollo = next(c for c in client.get("/api/companies").get_json() if c["name"] == "Apollo Diagnostics")
    apollo_tests = client.get(f"/api/tests?company_id={apollo['id']}").get_json()
    cbc = next(t for t in apollo_tests if t["code"] == "CBC")

    original_base = cbc["price"] # 350.0
    original_disc_pct = cbc["discount_percent"] # 10.0
    original_final = cbc["final_price"] # 315.0

    # 2. Customer creates booking
    res = client.post("/api/bookings", json={
        "company_id": apollo["id"],
        "test_id": cbc["id"],
        "patient_name": "Arjun Sundaram",
        "phone": "+91 9444455555",
        "collection_address": "12, Beach Road, Besant Nagar, Chennai",
        "appointment_date": "2026-10-25",
        "appointment_slot": "07:00 AM - 08:00 AM",
        "patient_email": "arjun.s@example.com"
    })
    assert res.status_code == 201
    booking = res.get_json()
    booking_id = booking["booking_id"]
    booking_ref = booking["booking_reference"]

    assert booking["base_price"] == original_base
    assert booking["final_amount"] == original_final

    # 3. Now simulate later price increase by Admin (e.g. CBC price increased to 500.0)
    # Login as admin
    from db import connect
    from werkzeug.security import generate_password_hash
    with connect() as conn:
        conn.execute("UPDATE staff_users SET password_hash=? WHERE username='admin'", (generate_password_hash("AdminPass@2026"),))
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "AdminPass@2026", "role": "admin"})
    admin_token = login_res.get_json()["access_token"]

    update_res = client.put(f"/api/admin/companies/{apollo['id']}/tests/{cbc['id']}", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "price": 500.0,
        "discount_percent": 0.0,
        "is_available": True
    })
    assert update_res.status_code == 200

    # 4. Verify that catalogue now has new price 500.0
    new_cbc = next(t for t in client.get(f"/api/tests?company_id={apollo['id']}").get_json() if t["code"] == "CBC")
    assert new_cbc["price"] == 500.0

    # 5. CRITICAL CHECK: Verify existing booking retained its immutable snapshot prices
    # Later price changes must NEVER change existing bookings or invoices!
    with connect() as conn:
        saved_booking = conn.execute("SELECT * FROM bookings WHERE id=?", (booking_id,)).fetchone()

    assert saved_booking["base_price_snapshot"] == original_base # Still 350.0!
    assert saved_booking["discount_percent_snapshot"] == original_disc_pct # Still 10.0%!
    assert saved_booking["final_amount_snapshot"] == original_final # Still 315.0!
    assert saved_booking["booking_reference"] == booking_ref

    # Restore price for other tests
    client.put(f"/api/admin/companies/{apollo['id']}/tests/{cbc['id']}", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "price": original_base,
        "discount_percent": original_disc_pct,
        "is_available": True
    })
