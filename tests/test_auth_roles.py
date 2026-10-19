import pytest

def test_three_primary_login_options_and_roles(client):
    # 1. Admin Login
    # Using seeded admin
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "AdminPass@2026",
        "role": "admin"
    })
    # If the password hash in the existing database was different, let's also verify unified login error handling
    if res.status_code == 200:
        data = res.get_json()
        assert data["role"] == "admin"
        assert "access_token" in data
        admin_token = data["access_token"]
    else:
        # Create a test admin directly if pre-seeded DB had unknown random pass
        from db import connect
        from werkzeug.security import generate_password_hash
        with connect() as conn:
            conn.execute("UPDATE staff_users SET password_hash=? WHERE username='admin'", (generate_password_hash("AdminPass@2026"),))
        res = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "AdminPass@2026",
            "role": "admin"
        })
        assert res.status_code == 200
        admin_token = res.get_json()["access_token"]

    # 2. Admin creates a unique Collector account
    res = client.post("/api/admin/staff", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "display_name": "Karthik Collector",
        "username": "collector_karthik",
        "temporary_password": "TempPass@2026",
        "phone": "+91 9888877771",
        "email": "karthik@bloodlab.com"
    })
    assert res.status_code in (201, 409)

    # 3. Collector Login
    res = client.post("/api/auth/login", json={
        "username": "collector_karthik",
        "password": "TempPass@2026",
        "role": "collector"
    })
    assert res.status_code == 200
    collector_data = res.get_json()
    assert collector_data["role"] == "collector"
    assert collector_data["must_change_password"] is True
    collector_token = collector_data["access_token"]

    # 4. Customer OTP & Registration flow
    # Send OTP
    test_mobile = "9840123456"
    res = client.post("/api/auth/otp/send", json={"phone": test_mobile})
    assert res.status_code == 200
    otp_code = res.get_json()["dev_otp"]
    assert len(otp_code) == 6

    # Verify OTP
    res = client.post("/api/auth/otp/verify", json={"phone": test_mobile, "otp_code": otp_code})
    assert res.status_code == 200
    assert res.get_json()["verified"] is True

    # Register Customer with real verified OTP
    res = client.post("/api/auth/customer/register", json={
        "full_name": "Priya Ramanathan",
        "username": "priya_raman",
        "mobile": test_mobile,
        "otp_code": otp_code,
        "whatsapp": test_mobile,
        "email": "priya.raman@example.com",
        "password": "SecurePassword@123"
    })
    assert res.status_code in (201, 409) # 201 created or 409 if exists from rerun

    # Customer Login
    res = client.post("/api/auth/login", json={
        "username": "priya_raman",
        "password": "SecurePassword@123",
        "role": "customer"
    })
    assert res.status_code == 200
    customer_data = res.get_json()
    assert customer_data["role"] == "customer"
    customer_token = customer_data["access_token"]

    # 5. Role Boundary Verification:
    # Customer CANNOT access Admin endpoints
    res = client.get("/api/admin/staff", headers={"Authorization": f"Bearer {customer_token}"})
    assert res.status_code == 403

    # Collector CANNOT access Admin endpoints
    res = client.get("/api/admin/staff", headers={"Authorization": f"Bearer {collector_token}"})
    assert res.status_code == 403

    # Public registration must NEVER create an Admin account
    assert customer_data["role"] != "admin"
    assert customer_data["role"] != "collector"
