import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent / "lab.db"

def connect():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def safe_add_column(cursor, table, column, definition):
    columns = [r[1] for r in cursor.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in columns:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

def init_and_migrate_db():
    with connect() as conn:
        cursor = conn.cursor()

        # 1. Staff users table (Preserve existing admin/collector accounts)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS staff_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'collector')),
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                display_name TEXT NOT NULL DEFAULT '',
                must_change_password INTEGER NOT NULL DEFAULT 0
            )
        """)
        safe_add_column(cursor, "staff_users", "display_name", "TEXT NOT NULL DEFAULT ''")
        safe_add_column(cursor, "staff_users", "must_change_password", "INTEGER NOT NULL DEFAULT 0")
        safe_add_column(cursor, "staff_users", "phone", "TEXT NOT NULL DEFAULT ''")
        safe_add_column(cursor, "staff_users", "email", "TEXT NOT NULL DEFAULT ''")

        # 2. Customers table (For customer self-registration with OTP)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                username TEXT NOT NULL UNIQUE,
                mobile TEXT NOT NULL UNIQUE,
                mobile_verified INTEGER NOT NULL DEFAULT 0,
                whatsapp TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)

        # 3. OTP verification log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                otp_code TEXT NOT NULL,
                purpose TEXT NOT NULL DEFAULT 'registration',
                expires_at TEXT NOT NULL,
                verified INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)

        # 4. Companies table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                brand_color TEXT NOT NULL DEFAULT '#1769AA',
                logo_url TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)
        safe_add_column(cursor, "companies", "active", "INTEGER NOT NULL DEFAULT 1")
        safe_add_column(cursor, "companies", "logo_data", "TEXT NOT NULL DEFAULT ''")
        safe_add_column(cursor, "companies", "contact_phone", "TEXT NOT NULL DEFAULT '+91 1800-425-0011'")
        safe_add_column(cursor, "companies", "contact_email", "TEXT NOT NULL DEFAULT 'support@bloodlab.com'")
        safe_add_column(cursor, "companies", "address", "TEXT NOT NULL DEFAULT 'National Reference Laboratory'")
        safe_add_column(cursor, "companies", "upi_id", "TEXT NOT NULL DEFAULT 'bloodlab@upi'")
        safe_add_column(cursor, "companies", "is_primary_tab", "INTEGER NOT NULL DEFAULT 0")

        # Ensure initial 3 companies exist
        initial_companies = [
            ("Apollo Diagnostics", "#16A34A", "", "+91 91765 67337", "apollodiaggowri@gmail.com", "Apollo Diagnostics - Blood Tests - Home Collection & Full Body Checkups Chennai", "apollo.bloodlab@upi", 1),
            ("PathCare", "#008C95", "", "+91 91507 23872", "pathcarediagnostics44@gmail.com", "PathCare Diagnostics - Advanced Pathology & Home Collection", "pathcare.bloodlab@upi", 1),
            ("Primgen", "#6C4AB6", "", "+91 1800-599-7746", "help@primgen.com", "Primgen Molecular Diagnostics, Bengaluru", "primgen.bloodlab@upi", 1),
        ]
        now_str = datetime.now().isoformat(timespec="seconds")
        # Clean up any duplicate casing before updating
        cursor.execute("DELETE FROM companies WHERE LOWER(name)='pathcare' AND id != (SELECT MIN(id) FROM companies WHERE LOWER(name)='pathcare')")
        cursor.execute("UPDATE companies SET name='PathCare', is_primary_tab=1 WHERE LOWER(name)='pathcare'")

        for name, color, logo, phone, email, addr, upi, is_tab in initial_companies:
            existing = cursor.execute("SELECT id FROM companies WHERE LOWER(name)=LOWER(?)", (name,)).fetchone()
            if not existing:
                cursor.execute("""
                    INSERT INTO companies (name, brand_color, logo_url, created_at, active, contact_phone, contact_email, address, upi_id, is_primary_tab)
                    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
                """, (name, color, logo, now_str, phone, email, addr, upi, is_tab))
            else:
                cursor.execute("""
                    UPDATE companies SET name=?, is_primary_tab=?, contact_phone=?,
                    contact_email=?, address=?,
                    upi_id=COALESCE(NULLIF(upi_id, ''), ?) WHERE id=?
                """, (name, is_tab, phone, email, addr, upi, existing["id"]))

        # 5. Master Test Catalog
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                price REAL NOT NULL
            )
        """)
        safe_add_column(cursor, "tests", "category", "TEXT NOT NULL DEFAULT 'Blood tests'")
        safe_add_column(cursor, "tests", "sample_type", "TEXT NOT NULL DEFAULT 'Blood'")
        safe_add_column(cursor, "tests", "description", "TEXT NOT NULL DEFAULT ''")
        safe_add_column(cursor, "tests", "preparation", "TEXT NOT NULL DEFAULT 'No special preparation needed'")
        safe_add_column(cursor, "tests", "active", "INTEGER NOT NULL DEFAULT 1")

        # 6. Company-specific Test Catalog (Allows independent prices, availability, sample type, etc.)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS company_tests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                test_id INTEGER NOT NULL,
                price REAL NOT NULL,
                discount_percent REAL NOT NULL DEFAULT 0.0,
                is_available INTEGER NOT NULL DEFAULT 1,
                sample_type TEXT NOT NULL DEFAULT 'Blood',
                description TEXT NOT NULL DEFAULT '',
                preparation_instructions TEXT NOT NULL DEFAULT 'No special preparation needed',
                turnaround_time TEXT NOT NULL DEFAULT 'Same Day / 24 hrs',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(company_id, test_id),
                FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
                FOREIGN KEY(test_id) REFERENCES tests(id) ON DELETE CASCADE
            )
        """)

        # 7. Bookings table with immutable snapshots & payment tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                test_id INTEGER NOT NULL,
                company_id INTEGER,
                appointment_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Booked',
                created_at TEXT NOT NULL
            )
        """)
        booking_migrations = {
            "booking_reference": "TEXT NOT NULL DEFAULT ''",
            "invoice_id": "TEXT NOT NULL DEFAULT ''",
            "customer_id": "INTEGER",
            "patient_email": "TEXT NOT NULL DEFAULT ''",
            "patient_whatsapp": "TEXT NOT NULL DEFAULT ''",
            "collection_address": "TEXT NOT NULL DEFAULT ''",
            "appointment_slot": "TEXT NOT NULL DEFAULT '07:00 AM - 08:30 AM'",
            "assigned_collector_id": "INTEGER",
            "collection_status": "TEXT NOT NULL DEFAULT 'Not Assigned'",
            "collector_latitude": "REAL",
            "collector_longitude": "REAL",
            "location_updated_at": "TEXT",
            "location_sharing_active": "INTEGER NOT NULL DEFAULT 0",
            # Immutable snapshots
            "company_name_snapshot": "TEXT NOT NULL DEFAULT ''",
            "test_name_snapshot": "TEXT NOT NULL DEFAULT ''",
            "test_category_snapshot": "TEXT NOT NULL DEFAULT ''",
            "sample_type_snapshot": "TEXT NOT NULL DEFAULT 'Blood'",
            "base_price_snapshot": "REAL NOT NULL DEFAULT 0.0",
            "discount_percent_snapshot": "REAL NOT NULL DEFAULT 0.0",
            "discount_amount_snapshot": "REAL NOT NULL DEFAULT 0.0",
            "final_amount_snapshot": "REAL NOT NULL DEFAULT 0.0",
            # Payment states: unpaid, pending, pending_collection, paid, failed, refunded
            "payment_status": "TEXT NOT NULL DEFAULT 'unpaid'",
            # payment_method_detail: 'cash_on_arrival', 'upi_online'
            "payment_method": "TEXT NOT NULL DEFAULT 'upi'",
            "payment_method_detail": "TEXT NOT NULL DEFAULT ''",
            "transaction_reference": "TEXT NOT NULL DEFAULT ''",
            "payment_receipt_data": "TEXT NOT NULL DEFAULT ''",
            "payment_verified_at": "TEXT",
            "payment_verified_by": "INTEGER",
            "payment_notes": "TEXT NOT NULL DEFAULT ''",
            "whatsapp_delivery_date": "TEXT NOT NULL DEFAULT ''",
            "whatsapp_note": "TEXT NOT NULL DEFAULT ''"
        }
        for col, definition in booking_migrations.items():
            safe_add_column(cursor, "bookings", col, definition)

        # 8. Booking audit events table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS booking_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER NOT NULL,
                actor_user_id INTEGER,
                event_type TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(booking_id) REFERENCES bookings(id)
            )
        """)

        # 9. Admin system settings
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        default_settings = [
            ("default_upi_id", "bloodlab@upi"),
            ("upi_payee_name", "BloodLab Diagnostic Services"),
            ("currency_symbol", "₹"),
            ("support_phone", "+91 1800-425-0011"),
            ("support_email", "support@bloodlab.com"),
            ("company_gstin", "33AAAAA0000A1Z5"),
            ("lab_address", "Central Diagnostic Center, Anna Salai, Chennai 600002")
        ]
        for k, v in default_settings:
            cursor.execute("INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)", (k, v, now_str))

        conn.commit()

if __name__ == "__main__":
    init_and_migrate_db()
    print("Database initialization and migrations completed successfully.")
