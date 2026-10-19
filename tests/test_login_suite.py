import pytest
from db import connect
from werkzeug.security import generate_password_hash

def test_full_login_suite_all_roles(client):
    # Ensure standard passwords for testing
    with connect() as conn:
        conn.execute("UPDATE staff_users SET password_hash=? WHERE username='admin'", 
                     (generate_password_hash("Admin123!"),))
        conn.execute("UPDATE staff_users SET password_hash=? WHERE username='collectorboy'", 
                     (generate_password_hash("CollectorPass123!"),))

    # 1. Admin Login Tests
    # A. Valid Admin
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "Admin123!",
        "role": "admin"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["role"] == "admin"
    assert "access_token" in data
    assert "display_name" in data

    # B. Invalid Admin Password
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "WrongPassword!",
        "role": "admin"
    })
    assert res.status_code == 401
    assert "Invalid username or password" in res.get_json()["error"]

    # C. Nonexistent Admin User
    res = client.post("/api/auth/login", json={
        "username": "nonexistent_admin",
        "password": "Password123!",
        "role": "admin"
    })
    assert res.status_code == 401

    # 2. Collector Boy Login Tests
    # A. Valid Collector Boy
    res = client.post("/api/auth/login", json={
        "username": "collectorboy",
        "password": "CollectorPass123!",
        "role": "collector"
    })
    assert res.status_code == 200
    cdata = res.get_json()
    assert cdata["role"] == "collector"
    assert "access_token" in cdata

    # B. Invalid Collector Password
    res = client.post("/api/auth/login", json={
        "username": "collectorboy",
        "password": "BadPassword123!",
        "role": "collector"
    })
    assert res.status_code == 401

    # 3. Customer Registration & Login Tests
    # A. Send OTP for customer
    phone = "9876500001"
    otp_res = client.post("/api/auth/otp/send", json={"phone": phone})
    assert otp_res.status_code == 200
    otp = otp_res.get_json()["dev_otp"]

    # B. Verify OTP
    v_res = client.post("/api/auth/otp/verify", json={"phone": phone, "otp_code": otp})
    assert v_res.status_code == 200

    # C. Register Customer
    reg_username = "test_customer_full"
    reg_res = client.post("/api/auth/customer/register", json={
        "full_name": "Test Customer User",
        "username": reg_username,
        "mobile": phone,
        "otp_code": otp,
        "whatsapp": phone,
        "email": "test_customer_full@example.com",
        "password": "CustomerSecure123!"
    })
    assert reg_res.status_code in (201, 409)

    # D. Customer Login via Username
    res = client.post("/api/auth/login", json={
        "username": reg_username,
        "password": "CustomerSecure123!",
        "role": "customer"
    })
    assert res.status_code == 200
    cust_data = res.get_json()
    assert cust_data["role"] == "customer"
    assert "access_token" in cust_data

    # E. Customer Login via Mobile
    res = client.post("/api/auth/login", json={
        "username": phone,
        "password": "CustomerSecure123!",
        "role": "customer"
    })
    assert res.status_code == 200
    assert res.get_json()["role"] == "customer"

    # F. Customer Login via Email
    res = client.post("/api/auth/login", json={
        "username": "test_customer_full@example.com",
        "password": "CustomerSecure123!",
        "role": "customer"
    })
    assert res.status_code == 200
    assert res.get_json()["role"] == "customer"

    # G. Customer Invalid Password
    res = client.post("/api/auth/login", json={
        "username": reg_username,
        "password": "WrongPassword999!",
        "role": "customer"
    })
    assert res.status_code == 401

    # 4. Role Cross-Contamination & Mismatch Checks
    # A. Customer trying to log in with role='admin'
    res = client.post("/api/auth/login", json={
        "username": reg_username,
        "password": "CustomerSecure123!",
        "role": "admin"
    })
    assert res.status_code == 401

    # B. Collector trying to log in with role='admin'
    res = client.post("/api/auth/login", json={
        "username": "collectorboy",
        "password": "CollectorPass123!",
        "role": "admin"
    })
    assert res.status_code == 401

    # C. Empty Credentials
    res = client.post("/api/auth/login", json={"username": "", "password": ""})
    assert res.status_code == 400
