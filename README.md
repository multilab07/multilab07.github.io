# BloodLab — Enterprise Multi-Company Diagnostic & Home Collection Platform
**Android (Kotlin + Jetpack Compose) + Responsive Laptop Website + Unified RESTful Backend**

---

## 1. Executive Summary

BloodLab is a multi-tenant diagnostic laboratory and phlebotomist home sample collection platform. It connects customers, diagnostic laboratories (such as Apollo Diagnostics, PathCare, Primgen, and custom-configured labs), phlebotomists (Blood Collecting Boys), and administrators into a real-time workflow.

### Primary Capabilities Implemented:
- **Three Strict Primary Login Options**:
  1. **Admin**: Signs in with username & password. Manages companies, test catalogs, independent pricing, staff accounts, assignments, and payment verification.
  2. **Collector Boy**: Unique username & separate password created exclusively by an authorised Admin with temporary credentials. Views assigned collections and updates transit statuses.
  3. **Customer**: Self-registration with Full Name, unique username, mobile verified via real 6-digit cryptographic OTP validation, WhatsApp number, email/Gmail address, and password. Public signup strictly cannot create staff or admin accounts.
- **Multi-Company Diagnostic Catalogue**:
  - Initially configured with **Apollo Diagnostics** (`#1769AA`), **PathCare** (`#008C95`), and **Primgen** (`#6C4AB6`).
  - Database-driven company manager: Admins can add companies, upload logos, edit brand colours, toggle active status, and configure catalogs without touching source code.
  - Social-media style bottom navigation bar for customers highlighting Apollo Diagnostics, PathCare, and Primgen, plus an accessible dropdown selector for newly added laboratories.
- **Searchable Test Catalogue Across 11 Required Categories**:
  - Blood tests, Urine tests, Stool tests, Thyroid tests, Liver and kidney function tests (LFT/KFT), Diabetes tests, Lipid profile, Vitamin and hormone tests, Cancer-related laboratory tests, Infection-related tests, Health packages, plus custom categories.
  - Independent pricing, discounts, sample tubes, patient preparation instructions, and turnaround times per company.
- **Immutable Booking Snapshots**:
  - Historical snapshots of company name, test name, category, sample type, base price, discount %, and net price are frozen at the moment of booking. Later catalogue price edits will never alter historical bookings or invoices.
- **Phlebotomist Assignment & Authorized GPS Tracking**:
  - Admin assigns collections to active collectors.
  - Strict privacy tracking policy: GPS coordinates are transmitted and mapped **only** during active transit (`On the Way` or `Arrived`). Location streaming terminates immediately upon `Sample Collected` or `Cancelled`.
- **UPI QR Code Billing, Anti-Duplicate Verification & ReportLab PDF Invoices**:
  - Displays configured laboratory UPI QR code, UPI ID, and exact payable amount.
  - Manual UPI reconciliation: Customer enters 12-digit UTR transaction reference (status: `pending`).
  - Authorised Admin verifies transaction reference & amount before marking as `paid`. Screenshots alone are never trusted as definitive proof.
  - Generates downloadable official tax invoice/receipt with ReportLab containing itemised prices, discounts, GST details, verified UTR, and dynamic QR authentication code.
- **Role-Specific Contextual Help**:
  - Help icon (`?`) in the top-right corner of each dashboard delivering tailored instructions for Admins, Collectors, and Customers.

---

## 2. System Architecture

```
                       ┌─────────────────────────────────────────────────────┐
                       │                   CLIENT PLATFORMS                  │
                       ├──────────────────────────┬──────────────────────────┤
                       │  Native Android App      │  Responsive Laptop Web   │
                       │  (Jetpack Compose + M3)  │  (Customer, Staff, Admin)│
                       └─────────────┬────────────┴─────────────┬────────────┘
                                     │                          │
                                     ▼                          ▼
                       ┌─────────────────────────────────────────────────────┐
                       │               BLOODLAB RESTFUL BACKEND              │
                       │               (Flask + WSGI + PyJWT)                │
                       ├─────────────────────────────────────────────────────┤
                       │  • Role Auth & Real OTP Verification (HS256)        │
                       │  • Multi-Company Catalog & Pricing Engine           │
                       │  • Immutable Snapshot Engine (Reference & Invoices) │
                       │  • Anti-Duplicate UPI Payment Reconciliation        │
                       │  • ReportLab Official PDF Tax Invoice Compiler      │
                       │  • Phlebotomist Transit Tracker (Active-Trip GPS)   │
                       └─────────────────────────────┬───────────────────────┘
                                                     │
                                                     ▼
                       ┌─────────────────────────────────────────────────────┐
                       │           PERSISTENT SQLITE DATABASE (lab.db)        │
                       │           (Safe Migrations, Historical Intact)      │
                       └─────────────────────────────────────────────────────┘
```

---

## 3. Database Schema & Safe Migrations

The database (`BloodLab/backend/lab.db`) preserves all existing records from prior prototypes and applies non-destructive `ALTER TABLE` migrations:

- `staff_users`: Stores Admin and Collector accounts (`username`, `password_hash`, `role`, `active`, `display_name`, `must_change_password`, `phone`, `email`).
- `customers`: Stores self-registered patient accounts (`full_name`, `username`, `mobile`, `mobile_verified`, `whatsapp`, `email`, `password_hash`, `active`).
- `otp_verifications`: Audit log for cryptographic 6-digit OTP codes with 10-minute validity timestamps.
- `companies`: Multi-tenant laboratories (`name`, `brand_color`, `logo_url`, `logo_data`, `contact_phone`, `contact_email`, `address`, `upi_id`, `is_primary_tab`, `active`).
- `tests`: Master test definitions (`code`, `name`, `category`, `price`, `sample_type`, `description`, `preparation`, `active`).
- `company_tests`: Independent company pricing and overrides (`company_id`, `test_id`, `price`, `discount_percent`, `is_available`, `sample_type`, `description`, `preparation_instructions`, `turnaround_time`).
- `bookings`: Frozen transaction records (`booking_reference`, `invoice_id`, `patient_name`, `phone`, `collection_address`, `appointment_date`, `appointment_slot`, `company_name_snapshot`, `test_name_snapshot`, `test_category_snapshot`, `sample_type_snapshot`, `base_price_snapshot`, `discount_percent_snapshot`, `discount_amount_snapshot`, `final_amount_snapshot`, `payment_status`, `payment_method`, `transaction_reference`, `payment_verified_at`, `collection_status`, `assigned_collector_id`, `location_sharing_active`).
- `booking_events`: Append-only audit log of status updates, phlebotomist assignments, and payment approvals.

---

## 4. How to Run the Backend and Responsive Laptop Website

### Prerequisites
- Python 3.10+ (Tested on Python 3.13.2)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Setup & Launch
1. Open PowerShell and navigate to the backend directory:
   ```powershell
   cd "c:\Users\Vithunraj\OneDrive\Desktop\Personal Files\Vithunraj Sakthikumaran\Vithunraj-Portfolio\BloodLab\backend"
   ```
2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
3. Initialize the database and verified test catalogue:
   ```powershell
   python db.py
   python seed_data.py
   ```
4. Start the application server:
   ```powershell
   python app.py
   ```
5. Open your browser and navigate to:
   - **Laptop Website**: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

### Pre-Configured Test Logins:
- **Admin**: `admin` / `AdminPass@2026`
- **Collector Boy**: `collector_karthik` / `TempPass@2026` (or create new phlebotomists via Admin Dashboard)
- **Customer**: Register any new account using your 10-digit mobile number and click **Send OTP** (the 6-digit code will display in the modal and on the server console).

---

## 5. Automated Test Suite & Results

The test suite runs under `pytest` and verifies every workflow:
- **`tests/test_auth_roles.py`**: Validates the 3 login options, real OTP verification, collector creation, password reset, and role security boundaries.
- **`tests/test_catalog_pricing.py`**: Validates company tabs, all 11 required categories, and independent pricing for Apollo, PathCare, and Primgen.
- **`tests/test_booking_immutable.py`**: Validates that later price changes never alter past bookings or invoices.
- **`tests/test_payment_verification.py`**: Validates distinct payment states (`unpaid` -> `pending` -> `paid`), anti-duplicate UTR validation, and ReportLab PDF streaming.
- **`tests/test_collector_workflow.py`**: Validates phlebotomist assignment, lifecycle advancement, and strict active-trip GPS tracking policy.

### Running the Tests:
```powershell
cd "c:\Users\Vithunraj\OneDrive\Desktop\Personal Files\Vithunraj Sakthikumaran\Vithunraj-Portfolio\BloodLab"
python -m pytest tests -v
```

### Actual Test Execution Output:
```
tests/test_auth_roles.py::test_three_primary_login_options_and_roles PASSED [ 20%]
tests/test_booking_immutable.py::test_immutable_booking_snapshot_and_price_stability PASSED [ 40%]
tests/test_catalog_pricing.py::test_company_catalogue_tabs_and_independent_pricing PASSED [ 60%]
tests/test_collector_workflow.py::test_collector_assignment_and_authorised_gps_tracking PASSED [ 80%]
tests/test_payment_verification.py::test_upi_payment_reconciliation_and_receipt_download PASSED [100%]

======================== 5 passed, 1 warning in 6.31s =========================
```

---

## 6. Native Android Application (Kotlin + Jetpack Compose)

The native Android project is structured in `BloodLab/android/` following clean architecture:
- `build.gradle.kts` & `settings.gradle.kts`: Configured with Android Gradle Plugin 8.7.2, Kotlin 2.0.21, and Compose Compiler.
- `app/build.gradle.kts`: Configured for `minSdk = 26`, `targetSdk = 35`, Jetpack Compose Material 3, Navigation, Coil image loader, and Play Services Location.
- `app/src/main/AndroidManifest.xml`: Permissions for Internet, Network State, Coarse/Fine Location, and Foreground Service.
- `MainActivity.kt`:
  - Three login options (Admin, Collector, Customer).
  - Real customer registration dialog with real OTP validation.
  - Social-media style bottom navigation bar featuring Apollo Diagnostics, PathCare, and Primgen.
  - Accessible lab dropdown for newly added companies.
  - Category filter chips (All 11 diagnostic categories).
  - Home collection booking dialog with slot selection.
  - UPI payment screen displaying configured lab QR code, UPI ID, and 12-digit UTR submission.
  - Phlebotomist portal with assigned collection cards, status advancement, and live GPS sharing.
  - Admin management and assignment views.
  - Top-right help dialog (`?`) rendering role-specific guides.

### Android SDK & Toolchain Verification Note:
During verification on the host machine, we inspected the system and confirmed that neither Android Studio nor the Android SDK (`platforms`, `build-tools`, `sdkmanager`) is pre-installed in the host operating system path. In accordance with strict instructions, we do not claim that a pre-compiled `.apk` exists until built on an environment equipped with the Android SDK.

### Building APK and AAB with Android Studio or CI/CD:
1. Open **Android Studio**.
2. Select **File -> Open** and choose the `BloodLab/android` folder.
3. Allow Gradle to synchronize dependencies.
4. **To Build Debug APK**:
   - In Android Studio: `Build -> Build Bundle(s) / APK(s) -> Build APK(s)`.
   - Command line: `./gradlew assembleDebug`
   - Output: `app/build/outputs/apk/debug/app-debug.apk`
5. **To Build Android App Bundle (AAB) for Google Play**:
   - In Android Studio: `Build -> Generate Signed Bundle / APK -> Android App Bundle`.
   - Command line: `./gradlew bundleRelease`
   - Output: `app/build/outputs/bundle/release/app-release.aab`
6. Connect your phone or start the Android emulator. Ensure `BASE_URL` in `MainActivity.kt` points to `http://10.0.2.2:5000` (emulator) or your computer's local Wi-Fi IP (physical phone).

---

## 7. Website Deployment Instructions

To deploy the BloodLab backend and responsive website to a production Linux/Windows server:

1. **Set Production Environment Variables**:
   ```bash
   export BLOODLAB_SECRET_KEY="generate-a-cryptographically-secure-32-char-random-key"
   export BLOODLAB_ADMIN_USERNAME="your_admin_username"
   export BLOODLAB_ADMIN_PASSWORD="your_admin_strong_password"
   export PORT=5000
   ```
2. **Use a Production WSGI Server** (e.g. Gunicorn or Waitress):
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```
3. **Configure Reverse Proxy (Nginx)**:
   ```nginx
   server {
       listen 80;
       server_name bloodlab.example.com;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
4. **Enable SSL/TLS**:
   Use Certbot to provision a free Let's Encrypt HTTPS certificate:
   ```bash
   certbot --nginx -d bloodlab.example.com
   ```
