import pytest
from db import connect
from werkzeug.security import generate_password_hash

def test_collector_assignment_and_authorised_gps_tracking(client):
    # Setup Admin & Collector logins
    with connect() as conn:
        conn.execute("UPDATE staff_users SET password_hash=? WHERE username='admin'", (generate_password_hash("AdminPass@2026"),))
        conn.execute("""
            INSERT INTO staff_users (username, password_hash, role, active, created_at, display_name, must_change_password)
            VALUES ('collector_subash', ?, 'collector', 1, '2026-10-18T00:00:00', 'Subash Phlebotomist', 0)
            ON CONFLICT(username) DO UPDATE SET active=1, password_hash=excluded.password_hash
        """, (generate_password_hash("CollectorPass@123"),))
        collector = conn.execute("SELECT id FROM staff_users WHERE username='collector_subash'").fetchone()
        collector_id = collector["id"]

    admin_token = client.post("/api/auth/login", json={"username": "admin", "password": "AdminPass@2026", "role": "admin"}).get_json()["access_token"]
    collector_token = client.post("/api/auth/login", json={"username": "collector_subash", "password": "CollectorPass@123", "role": "collector"}).get_json()["access_token"]

    # 1. Create a booking
    c_id = client.get("/api/companies").get_json()[0]["id"]
    t_id = client.get(f"/api/tests?company_id={c_id}").get_json()[0]["id"]
    booking_id = client.post("/api/bookings", json={
        "company_id": c_id, "test_id": t_id, "patient_name": "Suresh Kumar",
        "phone": "+91 9841098410", "collection_address": "88, Anna Salai, Chennai",
        "appointment_date": "2026-10-21", "appointment_slot": "07:30 AM - 08:30 AM"
    }).get_json()["booking_id"]

    # 2. Admin assigns booking to collector
    assign_res = client.post(f"/api/admin/bookings/{booking_id}/assign", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "collector_id": collector_id
    })
    assert assign_res.status_code == 200

    # 3. Collector sees assigned booking
    assigned_tasks = client.get("/api/collector/assignments", headers={"Authorization": f"Bearer {collector_token}"}).get_json()
    my_task = next(t for t in assigned_tasks if t["booking_id"] == booking_id)
    assert my_task["collection_status"] == "Assigned"

    # 4. Collector marks 'Accepted'
    res = client.patch(f"/api/collector/bookings/{booking_id}/status", headers={"Authorization": f"Bearer {collector_token}"}, json={"status": "Accepted"})
    assert res.status_code == 200
    assert res.get_json()["location_sharing_active"] is False

    # Attempt to post location while Accepted (before trip starts) -> must be rejected
    loc_res = client.post(f"/api/collector/bookings/{booking_id}/location", headers={"Authorization": f"Bearer {collector_token}"}, json={"latitude": 13.0827, "longitude": 80.2707})
    assert loc_res.status_code == 403

    # 5. Collector marks 'On the Way' -> Location tracking becomes ACTIVE
    res = client.patch(f"/api/collector/bookings/{booking_id}/status", headers={"Authorization": f"Bearer {collector_token}"}, json={"status": "On the Way"})
    assert res.status_code == 200
    assert res.get_json()["location_sharing_active"] is True

    # Post real GPS coordinates during active trip -> must succeed
    loc_res = client.post(f"/api/collector/bookings/{booking_id}/location", headers={"Authorization": f"Bearer {collector_token}"}, json={"latitude": 13.0827, "longitude": 80.2707})
    assert loc_res.status_code == 200

    # Admin live tracking displays collector position
    admin_tracking = client.get("/api/admin/tracking", headers={"Authorization": f"Bearer {admin_token}"}).get_json()
    active_trip = next((x for x in admin_tracking if x["booking_id"] == booking_id), None)
    assert active_trip is not None
    assert active_trip["latitude"] == 13.0827

    # 6. Collector marks 'Arrived'
    res = client.patch(f"/api/collector/bookings/{booking_id}/status", headers={"Authorization": f"Bearer {collector_token}"}, json={"status": "Arrived"})
    assert res.status_code == 200
    assert res.get_json()["location_sharing_active"] is True

    # 7. Collector marks 'Sample Collected' -> Location tracking STOPS immediately
    res = client.patch(f"/api/collector/bookings/{booking_id}/status", headers={"Authorization": f"Bearer {collector_token}"}, json={"status": "Sample Collected"})
    assert res.status_code == 200
    assert res.get_json()["location_sharing_active"] is False

    # Admin live tracking no longer lists this trip
    admin_tracking_after = client.get("/api/admin/tracking", headers={"Authorization": f"Bearer {admin_token}"}).get_json()
    assert not any(x["booking_id"] == booking_id for x in admin_tracking_after)
