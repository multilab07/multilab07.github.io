from datetime import datetime
from db import connect

VERIFIED_CATALOG = [
    # Blood tests
    {
        "code": "CBC",
        "name": "Complete Blood Count (CBC) with ESR",
        "category": "Blood tests",
        "sample_type": "EDTA Whole Blood (3 ml)",
        "description": "Evaluates overall health and detects a wide range of disorders including anaemia, infection, and leukemia. Measures RBC, WBC, platelets, and haemoglobin.",
        "preparation": "No fasting required. Stay hydrated.",
        "prices": {1: (350.0, 10.0), 2: (300.0, 5.0), 3: (320.0, 15.0)} # company_id: (price, discount_pct)
    },
    {
        "code": "BLDGRP",
        "name": "ABO Blood Grouping & Rh Factor Typing",
        "category": "Blood tests",
        "sample_type": "Whole Blood (2 ml)",
        "description": "Determines your ABO blood type (A, B, AB, or O) and Rh factor (positive or negative). Essential for transfusions and pregnancy planning.",
        "preparation": "No special preparation needed.",
        "prices": {1: (150.0, 0.0), 2: (120.0, 0.0), 3: (140.0, 5.0)}
    },
    {
        "code": "PBS",
        "name": "Peripheral Blood Smear (PBS) Examination",
        "category": "Blood tests",
        "sample_type": "EDTA Blood (2 ml)",
        "description": "Microscopic analysis of red cells, white cells, and platelets to identify abnormal cell morphology and parasitic infections.",
        "preparation": "No fasting required.",
        "prices": {1: (250.0, 5.0), 2: (200.0, 5.0), 3: (220.0, 10.0)}
    },

    # Urine tests
    {
        "code": "URINE_RE",
        "name": "Routine Urine Examination & Microscopy",
        "category": "Urine tests",
        "sample_type": "Midstream Spot Urine (15-20 ml)",
        "description": "Checks for metabolic disorders, urinary tract infections (UTI), kidney disease, glucose, protein, and micro-sediments.",
        "preparation": "First morning clean-catch midstream urine sample preferred in a sterile container.",
        "prices": {1: (180.0, 0.0), 2: (150.0, 0.0), 3: (160.0, 5.0)}
    },
    {
        "code": "URINE_CULTURE",
        "name": "Urine Culture & Antibiotic Sensitivity (Automated)",
        "category": "Urine tests",
        "sample_type": "Sterile Clean-Catch Urine (10 ml)",
        "description": "Isolates bacterial or fungal pathogens causing urinary tract infections and provides comprehensive antibiotic susceptibility testing.",
        "preparation": "Collect sample prior to starting antibiotic treatment.",
        "prices": {1: (750.0, 10.0), 2: (650.0, 5.0), 3: (700.0, 10.0)}
    },

    # Stool tests
    {
        "code": "STOOL_RE",
        "name": "Stool Routine & Microscopic Examination",
        "category": "Stool tests",
        "sample_type": "Fresh Stool (5-10 g)",
        "description": "Detects parasitic infestations, amoebiasis, giardiasis, presence of ova/cysts, occult blood, and intestinal inflammation.",
        "preparation": "Collect in clean, leak-proof wide-mouth container without urine contamination.",
        "prices": {1: (220.0, 5.0), 2: (180.0, 0.0), 3: (200.0, 5.0)}
    },
    {
        "code": "STOOL_OB",
        "name": "Stool Occult Blood (FOBT) Immunoassay",
        "category": "Stool tests",
        "sample_type": "Fresh Stool Sample",
        "description": "Highly sensitive immunoassay to detect hidden blood in stool, an early screening marker for colorectal lesions and ulcers.",
        "preparation": "Avoid red meat, iron supplements, and vitamin C for 48 hours prior to test.",
        "prices": {1: (380.0, 10.0), 2: (320.0, 5.0), 3: (350.0, 10.0)}
    },

    # Thyroid tests
    {
        "code": "THYROID_TOTAL",
        "name": "Thyroid Profile Total (T3, T4, TSH)",
        "category": "Thyroid tests",
        "sample_type": "Serum (3 ml)",
        "description": "Screening panel measuring triiodothyronine (T3), thyroxine (T4), and thyroid-stimulating hormone (TSH) to diagnose hyper/hypothyroidism.",
        "preparation": "Overnight fasting of 8-10 hours recommended. Morning collection preferred.",
        "prices": {1: (550.0, 15.0), 2: (450.0, 10.0), 3: (499.0, 20.0)}
    },
    {
        "code": "THYROID_FREE",
        "name": "Free Thyroid Profile (FT3, FT4, TSH Ultra-Sensitive)",
        "category": "Thyroid tests",
        "sample_type": "Serum (3 ml)",
        "description": "Measures unbound, biologically active thyroid hormones for accurate assessment independent of binding protein fluctuations.",
        "preparation": "Morning blood collection. Discontinue high-dose biotin supplements 48 hours before testing.",
        "prices": {1: (950.0, 10.0), 2: (850.0, 5.0), 3: (890.0, 15.0)}
    },

    # Liver and kidney function tests
    {
        "code": "LFT",
        "name": "Liver Function Test (LFT Comprehensive)",
        "category": "Liver and kidney function tests",
        "sample_type": "Serum (3 ml)",
        "description": "Evaluates hepatic health. Includes Total & Direct Bilirubin, SGOT/AST, SGPT/ALT, Alkaline Phosphatase, Total Protein, Albumin, and A/G ratio.",
        "preparation": "10-12 hours overnight fasting required. Plain water allowed.",
        "prices": {1: (700.0, 10.0), 2: (600.0, 5.0), 3: (650.0, 15.0)}
    },
    {
        "code": "KFT",
        "name": "Kidney Function Test (KFT / RFT with Electrolytes)",
        "category": "Liver and kidney function tests",
        "sample_type": "Serum (3 ml)",
        "description": "Assesses renal clearance and filtration. Includes Blood Urea Nitrogen, Serum Creatinine, Uric Acid, Sodium, Potassium, and Chloride.",
        "preparation": "8-10 hours fasting recommended. Avoid heavy meat meal the evening before.",
        "prices": {1: (650.0, 10.0), 2: (550.0, 5.0), 3: (600.0, 10.0)}
    },

    # Diabetes tests
    {
        "code": "GLUCOSE_FASTING",
        "name": "Blood Glucose Fasting (FBS)",
        "category": "Diabetes tests",
        "sample_type": "Fluoride Plasma (2 ml)",
        "description": "Measures blood glucose concentration after an overnight fast. Primary screening parameter for diabetes and prediabetes.",
        "preparation": "Strict 8 to 10 hours overnight fasting. No food or beverage except water.",
        "prices": {1: (100.0, 0.0), 2: (80.0, 0.0), 3: (90.0, 5.0)}
    },
    {
        "code": "HBA1C",
        "name": "HbA1c Glycated Haemoglobin (HPLC Method)",
        "category": "Diabetes tests",
        "sample_type": "EDTA Whole Blood (2 ml)",
        "description": "Gold standard indicator reflecting average blood glucose control over the preceding 2 to 3 months. Certified NGSP / IFCC protocol.",
        "preparation": "Fasting not mandatory; sample can be collected at any time of day.",
        "prices": {1: (500.0, 10.0), 2: (420.0, 5.0), 3: (450.0, 15.0)}
    },
    {
        "code": "GLUCOSE_PP",
        "name": "Blood Glucose Post Prandial (PPBS)",
        "category": "Diabetes tests",
        "sample_type": "Fluoride Plasma (2 ml)",
        "description": "Measures blood glucose response exactly 2 hours after completion of a meal or standardized glucose load.",
        "preparation": "Collect sample precisely 2 hours after starting breakfast/lunch.",
        "prices": {1: (100.0, 0.0), 2: (80.0, 0.0), 3: (90.0, 5.0)}
    },

    # Lipid profile
    {
        "code": "LIPID_PROFILE",
        "name": "Complete Lipid Profile (Cardiovascular Risk)",
        "category": "Lipid profile",
        "sample_type": "Serum (3 ml)",
        "description": "Comprehensive cardiac risk panel measuring Total Cholesterol, HDL (good) cholesterol, LDL (bad) cholesterol, VLDL, and Triglycerides.",
        "preparation": "12 to 14 hours strict overnight fasting required. Avoid alcohol for 24 hours.",
        "prices": {1: (650.0, 15.0), 2: (500.0, 10.0), 3: (550.0, 20.0)}
    },

    # Vitamin and hormone tests
    {
        "code": "VITAMIN_D",
        "name": "Vitamin D 25-Hydroxy (Total D2 + D3)",
        "category": "Vitamin and hormone tests",
        "sample_type": "Serum (3 ml)",
        "description": "Measures circulating vitamin D essential for calcium homeostasis, bone density, and immune modulation. Chemiluminescence method.",
        "preparation": "No fasting required.",
        "prices": {1: (1200.0, 20.0), 2: (999.0, 15.0), 3: (1050.0, 25.0)}
    },
    {
        "code": "VITAMIN_B12",
        "name": "Vitamin B12 (Cyanocobalamin Assay)",
        "category": "Vitamin and hormone tests",
        "sample_type": "Serum (3 ml)",
        "description": "Vital for nerve function, neurological health, and red blood cell production. Diagnoses megaloblastic anaemia and peripheral neuropathy.",
        "preparation": "Overnight fasting preferred. Avoid vitamin B-complex supplements 24 hours prior.",
        "prices": {1: (950.0, 15.0), 2: (800.0, 10.0), 3: (850.0, 20.0)}
    },
    {
        "code": "TESTOSTERONE",
        "name": "Serum Testosterone (Total)",
        "category": "Vitamin and hormone tests",
        "sample_type": "Serum (3 ml)",
        "description": "Principal androgen responsible for male sexual characteristics, libido, and muscle mass. Also evaluated in women for PCOS / hirsutism.",
        "preparation": "Collect early morning between 7:00 AM and 10:00 AM when peak concentrations occur.",
        "prices": {1: (700.0, 10.0), 2: (600.0, 5.0), 3: (650.0, 10.0)}
    },

    # Cancer-related laboratory tests
    {
        "code": "PSA_TOTAL",
        "name": "PSA Total (Prostate Specific Antigen)",
        "category": "Cancer-related laboratory tests",
        "sample_type": "Serum (3 ml)",
        "description": "Tumour marker utilized for early detection, staging, and monitoring of benign prostatic hyperplasia (BPH) and prostate carcinoma.",
        "preparation": "Avoid sexual activity, rectal examination, or cycling for 48 hours prior to sampling.",
        "prices": {1: (850.0, 10.0), 2: (750.0, 5.0), 3: (800.0, 10.0)}
    },
    {
        "code": "CA_125",
        "name": "CA-125 (Ovarian Cancer / Endometriosis Marker)",
        "category": "Cancer-related laboratory tests",
        "sample_type": "Serum (3 ml)",
        "description": "Monitors ovarian cancer treatment response and recurrence, also elevated in certain pelvic inflammatory states and endometriosis.",
        "preparation": "Non-fasting. Avoid testing during active menstruation.",
        "prices": {1: (1400.0, 15.0), 2: (1200.0, 10.0), 3: (1300.0, 20.0)}
    },
    {
        "code": "CEA",
        "name": "CEA (Carcinoembryonic Antigen)",
        "category": "Cancer-related laboratory tests",
        "sample_type": "Serum (3 ml)",
        "description": "General oncological biomarker monitored primarily in gastrointestinal, colorectal, pancreatic, and breast malignancies.",
        "preparation": "No fasting needed. Indicate smoking status to laboratory staff.",
        "prices": {1: (1100.0, 10.0), 2: (950.0, 5.0), 3: (1000.0, 15.0)}
    },

    # Infection-related tests
    {
        "code": "DENGUE_DUO",
        "name": "Dengue Duo Panel (NS1 Antigen + IgG & IgM Antibodies)",
        "category": "Infection-related tests",
        "sample_type": "Serum (3 ml)",
        "description": "Comprehensive dengue virus detection detecting early NS1 viral protein (day 1-5) and secondary humoral antibodies (IgG & IgM).",
        "preparation": "No fasting required. Report fever duration to phlebotomist.",
        "prices": {1: (900.0, 10.0), 2: (750.0, 5.0), 3: (800.0, 15.0)}
    },
    {
        "code": "TYPHOID_WIDAL",
        "name": "Widal Slide & Tube Agglutination (Typhoid Fever)",
        "category": "Infection-related tests",
        "sample_type": "Serum (2 ml)",
        "description": "Identifies agglutinating antibodies against Salmonella enterica serovars typhi (O & H) and paratyphi for enteric fever diagnosis.",
        "preparation": "No fasting required.",
        "prices": {1: (250.0, 5.0), 2: (180.0, 0.0), 3: (200.0, 5.0)}
    },
    {
        "code": "CRP_QUANT",
        "name": "C-Reactive Protein (CRP Quantitative Turbidimetry)",
        "category": "Infection-related tests",
        "sample_type": "Serum (2 ml)",
        "description": "Acute-phase inflammatory marker sensitive to bacterial infections, autoimmune flare-ups, and systemic inflammatory syndromes.",
        "preparation": "No special preparation needed.",
        "prices": {1: (400.0, 5.0), 2: (320.0, 0.0), 3: (350.0, 10.0)}
    },

    # Health packages
    {
        "code": "FULL_BODY_CHECKUP",
        "name": "Comprehensive Full Body Health Checkup (65 Parameters)",
        "category": "Health packages",
        "sample_type": "Fasting Blood & Urine",
        "description": "Complete wellness master screening including CBC (24), Complete Lipid Profile (8), Liver Function LFT (11), Kidney Profile KFT (7), Fasting Glucose, HbA1c, Thyroid TSH, Urine Routine (10).",
        "preparation": "10-12 hours overnight fasting mandatory. First morning urine sample.",
        "prices": {1: (2499.0, 25.0), 2: (1999.0, 20.0), 3: (2199.0, 30.0)}
    },
    {
        "code": "SENIOR_WELLNESS",
        "name": "Senior Citizen Wellness Package (52 Parameters)",
        "category": "Health packages",
        "sample_type": "Fasting Blood & Urine",
        "description": "Tailored geriatric profile: CBC, Liver, Kidney, Calcium, Phosphorus, Uric Acid, Glycated HbA1c, Complete Lipids, Cardiac Risk Markers, and Urine Microscopy.",
        "preparation": "10-12 hours overnight fasting. Routine morning medications may be taken with water unless instructed otherwise.",
        "prices": {1: (2199.0, 20.0), 2: (1799.0, 15.0), 3: (1899.0, 25.0)}
    },
    {
        "code": "DIABETES_CARE_PKG",
        "name": "Advanced Diabetes Care & Vascular Health Package",
        "category": "Health packages",
        "sample_type": "Fasting Blood & Spot Urine",
        "description": "Fasting Glucose, HbA1c, Urine Microalbumin/Creatinine Ratio, Renal Function KFT, Lipid Profile, and High-Sensitivity CRP.",
        "preparation": "10 hours overnight fasting. Bring morning diabetic medications to take after blood collection.",
        "prices": {1: (1499.0, 15.0), 2: (1199.0, 10.0), 3: (1299.0, 20.0)}
    }
]

def seed_verified_data():
    now_str = datetime.utcnow().isoformat(timespec="seconds")
    with connect() as conn:
        cursor = conn.cursor()

        # Seed tests and company-specific pricing
        for t in VERIFIED_CATALOG:
            existing = cursor.execute("SELECT id FROM tests WHERE code=?", (t["code"],)).fetchone()
            if not existing:
                # Use Apollo (company 1) price as base test price
                base_price = t["prices"].get(1, (300.0, 0.0))[0]
                cursor.execute("""
                    INSERT INTO tests (code, name, price, category, sample_type, description, preparation, active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """, (t["code"], t["name"], base_price, t["category"], t["sample_type"], t["description"], t["preparation"]))
                test_id = cursor.lastrowid
            else:
                test_id = existing["id"]
                cursor.execute("""
                    UPDATE tests SET name=?, category=?, sample_type=?, description=?, preparation=?, active=1
                    WHERE id=?
                """, (t["name"], t["category"], t["sample_type"], t["description"], t["preparation"], test_id))

            # Configure company-specific pricing and availability
            for company_id, (price, discount) in t["prices"].items():
                cursor.execute("""
                    INSERT INTO company_tests
                    (company_id, test_id, price, discount_percent, is_available, sample_type, description, preparation_instructions, turnaround_time, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'Same Day / 24 hrs', ?, ?)
                    ON CONFLICT(company_id, test_id) DO UPDATE SET
                    price=excluded.price,
                    discount_percent=excluded.discount_percent,
                    sample_type=excluded.sample_type,
                    description=excluded.description,
                    preparation_instructions=excluded.preparation_instructions,
                    updated_at=excluded.updated_at
                """, (company_id, test_id, price, discount, t["sample_type"], t["description"], t["preparation"], now_str, now_str))

        conn.commit()
    print("Verified laboratory test catalog and company pricing seeded successfully.")

if __name__ == "__main__":
    seed_verified_data()
