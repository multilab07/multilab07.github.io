/**
 * BloodLab Frontend Core Application
 * Full implementation supporting Admin, Collector Boy, and Customer roles.
 */

const App = (function () {
  let token = localStorage.getItem("bloodlab_token") || "";
  let currentUser = JSON.parse(localStorage.getItem("bloodlab_user") || "null");
  let companies = [];
  let currentCompanyId = 1;
  let allTests = [];
  let currentCategory = "All";
  let searchQuery = "";
  let loginRole = "customer";
  let selectedTestIds = [];
  let map = null;
  let mapMarkers = {};
  let mapTimer = null;
  let collectorGeoWatch = null;
  let collectorActiveBookingId = null;

  // ---------------- AMBIENT LIVE MOLECULAR BACKGROUND ----------------
  function initAmbientParticles() {
    const canvas = document.getElementById("particleCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(Math.floor((width * height) / 16000), 50);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.2 + 1,
        color: ["rgba(14, 165, 233, ", "rgba(99, 102, 241, ", "rgba(16, 185, 129, ", "rgba(56, 189, 248, "][Math.floor(Math.random() * 4)]
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Draw constellation links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + "0.65)";
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color + "0.8)";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      requestAnimationFrame(animate);
    }
    animate();
  }


  const MOCK_COMPANIES = [
    {
      id: 1,
      name: "Apollo Diagnostics",
      full_title: "Apollo Diagnostics - Blood Tests - Home Collection & Full Body Checkups Chennai",
      badge: "NABL Accredited • Santhoshpuram Chennai Hub",
      brand_color: "#16a34a",
      theme_color: "#16a34a",
      upi_id: "apollodiagnostics@upi",
      contact_phone: "+91 91765 67337",
      contact_email: "apollodiaggowri@gmail.com",
      address: "Santhoshpuram, Chennai, Tamil Nadu",
      coverage_area: "Pallikaranai to Tambaram Corridor (Pallikaranai, Medavakkam, Santhoshpuram, Gowrivakkam, Sembakkam, Selaiyur, Tambaram)",
      map_url: "https://share.google/0cAngOv1ttXVozu1D",
      instagram_url: "https://www.instagram.com/apollo_diagnostic_santhoshpura?dlrf=MW04M3F4MnNzenM4Yg==",
      instagram_handle: "@apollo_diagnostic_santhoshpura",
      timings: "Mon – Sun: 6:30 AM – 9:00 PM (Home Collection: 6:00 AM onwards)",
      is_primary_tab: true,
      active: true
    },
    {
      id: 2,
      name: "PathCare Diagnostics",
      full_title: "PathCare Diagnostics - Advanced Pathology & Home Collection",
      badge: "ISO Certified Diagnostic Pathology Center",
      brand_color: "#008c95",
      theme_color: "#008c95",
      upi_id: "pathcarediagnostics@upi",
      contact_phone: "+91 91507 23872",
      contact_email: "pathcarediagnostics44@gmail.com",
      address: "PathCare Diagnostics Advanced Center, Chennai",
      coverage_area: "Pallikaranai to Tambaram Corridor",
      map_url: "",
      instagram_url: "https://www.instagram.com/path_care_diagnostics26?psln=cWV5cDV5MjZwZTd2",
      instagram_handle: "@path_care_diagnostics26",
      timings: "Mon – Sat: 7:00 AM – 8:30 PM (Sun: 7:00 AM – 1:00 PM)",
      is_primary_tab: true,
      active: true
    },
    {
      id: 3,
      name: "MultiLab07 Flagship Hub",
      full_title: "MultiLab07 Central Pathology Network",
      badge: "Super-Specialty Diagnostics & Phlebotomy",
      brand_color: "#0284c7",
      theme_color: "#0284c7",
      upi_id: "multilab07@upi",
      contact_phone: "+91 98401 23456",
      contact_email: "care@multilab07.com",
      address: "Central Diagnostics Tower, Chennai & Bangalore",
      map_url: "",
      instagram_url: "",
      instagram_handle: "",
      is_primary_tab: true,
      active: true
    }
  ];

  const MOCK_CATEGORIES = [
    "All", "Blood Tests", "Diabetes & Sugar", "Thyroid Profile", "Cardiac & Heart", "Kidney Function (KFT)", "Liver Function (LFT)", "Vitamins & Minerals", "Complete Health Packages"
  ];

  const MOCK_TESTS = [
    {
      id: 1,
      company_id: 1,
      name: "Complete Blood Count (CBC) with ESR",
      code: "CBC-01",
      category: "Blood Tests",
      price: 550,
      discount_percent: 45,
      final_price: 299,
      description: "Hemoglobin, RBC, WBC total & differential count, platelets, and ESR rate.",
      preparation: "No fasting required. Hydrate normally.",
      sample_type: "Whole Blood (EDTA)",
      turnaround_time: "6 hours",
      is_available: 1
    },
    {
      id: 2,
      company_id: 1,
      name: "Fasting Blood Glucose (FBS)",
      code: "GLU-01",
      category: "Diabetes & Sugar",
      price: 200,
      discount_percent: 50,
      final_price: 99,
      description: "Accurate blood sugar evaluation to screen and monitor prediabetes and diabetes.",
      preparation: "Strict 8-10 hours overnight fasting required. Water is allowed.",
      sample_type: "Fluoride Plasma",
      turnaround_time: "4 hours",
      is_available: 1
    },
    {
      id: 3,
      company_id: 1,
      name: "HbA1c (Glycated Hemoglobin)",
      code: "HBA1C",
      category: "Diabetes & Sugar",
      price: 700,
      discount_percent: 43,
      final_price: 399,
      description: "Gold standard test measuring average blood glucose levels over past 3 months.",
      preparation: "Fasting not strictly required.",
      sample_type: "Whole Blood (EDTA)",
      turnaround_time: "6 hours",
      is_available: 1
    },
    {
      id: 4,
      company_id: 1,
      name: "Thyroid Profile Total (T3, T4, TSH)",
      code: "THY-03",
      category: "Thyroid Profile",
      price: 750,
      discount_percent: 53,
      final_price: 349,
      description: "Evaluates hyperthyroidism, hypothyroidism, and endocrine gland health.",
      preparation: "Early morning fasting sample recommended.",
      sample_type: "Serum",
      turnaround_time: "8 hours",
      is_available: 1
    },
    {
      id: 5,
      company_id: 1,
      name: "Lipid Profile Comprehensive",
      code: "LIPID-FULL",
      category: "Cardiac & Heart",
      price: 1100,
      discount_percent: 50,
      final_price: 549,
      description: "Total Cholesterol, Triglycerides, HDL, LDL, VLDL, and Cardiac Risk Ratio.",
      preparation: "10-12 hours overnight fasting mandatory.",
      sample_type: "Serum",
      turnaround_time: "8 hours",
      is_available: 1
    },
    {
      id: 6,
      company_id: 1,
      name: "Liver Function Test (LFT with Enzymes)",
      code: "LFT-01",
      category: "Liver Function (LFT)",
      price: 950,
      discount_percent: 47,
      final_price: 499,
      description: "SGOT/AST, SGPT/ALT, Bilirubin Total/Direct, Alkaline Phosphatase, Protein.",
      preparation: "8 hours fasting. Avoid heavy fatty dinner prior to test.",
      sample_type: "Serum",
      turnaround_time: "6 hours",
      is_available: 1
    },
    {
      id: 7,
      company_id: 1,
      name: "Kidney Function Test (KFT with Electrolytes)",
      code: "KFT-01",
      category: "Kidney Function (KFT)",
      price: 1000,
      discount_percent: 45,
      final_price: 549,
      description: "Serum Creatinine, Blood Urea Nitrogen (BUN), Uric Acid, Sodium, Potassium.",
      preparation: "Overnight fasting recommended.",
      sample_type: "Serum",
      turnaround_time: "6 hours",
      is_available: 1
    },
    {
      id: 8,
      company_id: 1,
      name: "Vitamin D (25-Hydroxy) Deficiency Test",
      code: "VIT-D3",
      category: "Vitamins & Minerals",
      price: 1600,
      discount_percent: 56,
      final_price: 699,
      description: "Measures 25-OH Vitamin D for bone density, muscle weakness, and immunity.",
      preparation: "No special diet or fasting required.",
      sample_type: "Serum",
      turnaround_time: "12 hours",
      is_available: 1
    },
    {
      id: 9,
      company_id: 1,
      name: "Vitamin B12 (Cyanocobalamin)",
      code: "VIT-B12",
      category: "Vitamins & Minerals",
      price: 1300,
      discount_percent: 54,
      final_price: 599,
      description: "Assesses nerve health, red blood cell synthesis, and brain cognitive function.",
      preparation: "Overnight fasting preferred.",
      sample_type: "Serum",
      turnaround_time: "8 hours",
      is_available: 1
    },
    {
      id: 10,
      company_id: 1,
      name: "MultiLab07 Executive Platinum Health Check (84 Tests)",
      code: "MLB-PLATINUM",
      category: "Complete Health Packages",
      price: 4999,
      discount_percent: 70,
      final_price: 1499,
      description: "Full body screening: CBC, Lipid, Liver, Kidney, Thyroid, HbA1c, Vit D & B12 + Urine Routine.",
      preparation: "10-12 hours fasting. Free phlebotomist home collection included.",
      sample_type: "Blood & Urine",
      turnaround_time: "12 hours",
      is_available: 1
    },
    {
      id: 11,
      company_id: 1,
      name: "Cardiac Risk Assessment Panel (Troponin + hsCRP + Lipid)",
      code: "CARDIO-01",
      category: "Cardiac & Heart",
      price: 2400,
      discount_percent: 50,
      final_price: 1199,
      description: "High-sensitivity CRP, Troponin I, and complete lipid profile for heart evaluation.",
      preparation: "10 hours fasting.",
      sample_type: "Serum",
      turnaround_time: "8 hours",
      is_available: 1
    },
    {
      id: 12,
      company_id: 1,
      name: "Dengue NS1 Antigen + IgG & IgM Antibodies",
      code: "DENGUE-01",
      category: "Blood Tests",
      price: 1200,
      discount_percent: 46,
      final_price: 649,
      description: "Rapid differential detection for acute dengue viral fever and immune response.",
      preparation: "No fasting required. Immediate lab processing.",
      sample_type: "Serum",
      turnaround_time: "4 hours",
      is_available: 1
    },
    {
      id: 13,
      company_id: 2,
      name: "Apollo Total Body Care (72 Parameters)",
      code: "APOLLO-72",
      category: "Complete Health Packages",
      price: 4500,
      discount_percent: 64,
      final_price: 1599,
      description: "Full preventive health screen with Apollo certified pathologist sign-off.",
      preparation: "10-12 hours overnight fasting.",
      sample_type: "Blood & Urine",
      turnaround_time: "12 hours",
      is_available: 1
    },
    {
      id: 14,
      company_id: 2,
      name: "Complete Blood Count (CBC) with Peripheral Smear",
      code: "CBC-APOLLO",
      category: "Blood Tests",
      price: 600,
      discount_percent: 46,
      final_price: 320,
      description: "Automated hematology cell counter profile with microscopic smear examination.",
      preparation: "No fasting required.",
      sample_type: "Whole Blood",
      turnaround_time: "6 hours",
      is_available: 1
    },
    {
      id: 15,
      company_id: 3,
      name: "Swasthfit Super Health Checkup",
      code: "LAL-SUPER",
      category: "Complete Health Packages",
      price: 5200,
      discount_percent: 65,
      final_price: 1799,
      description: "National reference package covering liver, heart, sugar, kidney, and thyroid.",
      preparation: "12 hours fasting.",
      sample_type: "Blood & Urine",
      turnaround_time: "12 hours",
      is_available: 1
    },
    {
      id: 16,
      company_id: 4,
      name: "Aarogyam C Comprehensive Package (64 Tests)",
      code: "THY-AAROGYAM",
      category: "Complete Health Packages",
      price: 3600,
      discount_percent: 64,
      final_price: 1299,
      description: "Thyrocare signature preventive profile with comprehensive hormone & lipid assays.",
      preparation: "10-12 hours fasting.",
      sample_type: "Blood & Urine",
      turnaround_time: "14 hours",
      is_available: 1
    }
  ];

  // ---------------- MOCK DATA & FULL PERSISTENCE ENGINE ----------------
  const MOCK_STORAGE_STAFF = "multilab07_staff_v4";
  const MOCK_STORAGE_COMPANIES = "multilab07_companies_v4";
  const MOCK_STORAGE_TESTS = "multilab07_tests_v4";
  const MOCK_STORAGE_BOOKINGS = "multilab07_bookings_v4";

  function getStoredStaff() {
    let list = null;
    try {
      const data = localStorage.getItem(MOCK_STORAGE_STAFF);
      if (data) list = JSON.parse(data);
    } catch (e) {}

    if (!Array.isArray(list) || list.length === 0) {
      list = [
        { id: 1, username: "admin", display_name: "MultiLab Director", role: "admin", password: "Admin@MultiLab2026", phone: "+91 98401 23456", active: true },
        { id: 2, username: "collectorboy", display_name: "Rahul Phlebotomist", role: "collector", password: "CollectorPass123!", phone: "+91 98401 99999", active: true }
      ];
      saveStoredStaff(list);
      return list;
    }

    // Auto-update admin password to Admin@MultiLab2026 if it was on older default or outdated
    const adminUser = list.find((s) => s.username && s.username.toLowerCase() === "admin");
    if (adminUser) {
      if (!adminUser.password || adminUser.password === "Admin123!" || adminUser.password === "AdminPass@2026") {
        adminUser.password = "Admin@MultiLab2026";
        saveStoredStaff(list);
      }
    }
    return list;
  }

  function saveStoredStaff(list) {
    try {
      localStorage.setItem(MOCK_STORAGE_STAFF, JSON.stringify(list));
    } catch (e) {}
  }

  function getStoredCompanies() {
    let list = null;
    try {
      const data = localStorage.getItem(MOCK_STORAGE_COMPANIES);
      if (data) list = JSON.parse(data);
    } catch (e) {}

    if (!Array.isArray(list) || list.length === 0) {
      list = MOCK_COMPANIES;
      saveStoredCompanies(list);
      return list;
    }

    const apollo = list.find(c => c.id === 1 || (c.name && c.name.toLowerCase().includes("apollo")));
    if (apollo) {
      apollo.name = "Apollo Diagnostics";
      apollo.full_title = "Apollo Diagnostics - Blood Tests - Home Collection & Full Body Checkups Chennai";
      apollo.contact_phone = "+91 91765 67337";
      apollo.contact_email = "apollodiaggowri@gmail.com";
      apollo.address = "Santhoshpuram, Chennai, Tamil Nadu";
      apollo.map_url = "https://share.google/0cAngOv1ttXVozu1D";
      apollo.instagram_url = "https://www.instagram.com/apollo_diagnostic_santhoshpura?dlrf=MW04M3F4MnNzenM4Yg==";
      apollo.instagram_handle = "@apollo_diagnostic_santhoshpura";
    }

    const pathcare = list.find(c => c.id === 2 || (c.name && c.name.toLowerCase().includes("pathcare")));
    if (pathcare) {
      pathcare.name = "PathCare Diagnostics";
      pathcare.full_title = "PathCare Diagnostics - Advanced Pathology & Home Collection";
      pathcare.contact_phone = "+91 91507 23872";
      pathcare.contact_email = "pathcarediagnostics44@gmail.com";
      pathcare.instagram_url = "https://www.instagram.com/path_care_diagnostics26?psln=cWV5cDV5MjZwZTd2";
      pathcare.instagram_handle = "@path_care_diagnostics26";
    }

    saveStoredCompanies(list);
    return list;
  }

  function saveStoredCompanies(list) {
    try {
      localStorage.setItem(MOCK_STORAGE_COMPANIES, JSON.stringify(list));
    } catch (e) {}
  }

  function getStoredTests() {
    try {
      const data = localStorage.getItem(MOCK_STORAGE_TESTS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(MOCK_STORAGE_TESTS, JSON.stringify(MOCK_TESTS));
    return MOCK_TESTS;
  }

  function saveStoredTests(list) {
    try {
      localStorage.setItem(MOCK_STORAGE_TESTS, JSON.stringify(list));
    } catch (e) {}
  }

  function normalizeBooking(b) {
    if (!b || typeof b !== "object") return b;
    const rawAmt = b.payable_amount !== undefined ? b.payable_amount : (b.final_amount_snapshot !== undefined ? b.final_amount_snapshot : (b.total_amount !== undefined ? b.total_amount : (b.amount !== undefined ? b.amount : 499)));
    const amt = typeof rawAmt === "number" ? rawAmt : (parseFloat(rawAmt) || 499);
    const code = b.booking_code || b.booking_reference || ("MLB-2026-" + (b.id || 101));
    const compName = b.company_name || b.company_name_snapshot || "Apollo Diagnostics";
    const testName = b.test_name || b.test_name_snapshot || "Complete Blood Count (CBC) with ESR";
    const patientName = b.patient_name || (currentUser ? currentUser.display_name : "Valued Customer");
    const phone = b.patient_phone || b.phone || "+91 91765 67337";
    const dateStr = b.scheduled_date || b.appointment_date || new Date().toISOString().split("T")[0];
    const slotStr = b.time_slot || b.appointment_slot || "08:00 AM - 10:00 AM";
    const addrStr = b.address || b.collection_address || "Pallikaranai to Tambaram Service Zone, Chennai";
    const pStatus = (b.payment_status || "unpaid").toLowerCase();
    const cStatus = b.status || b.collection_status || "CONFIRMED";

    return {
      ...b,
      id: b.id || Date.now(),
      booking_code: code,
      booking_reference: b.booking_reference || code,
      invoice_id: b.invoice_id || ("INV-" + code),
      test_name: testName,
      test_name_snapshot: b.test_name_snapshot || testName,
      sample_type_snapshot: b.sample_type_snapshot || b.sample_type || "EDTA Whole Blood",
      company_name: compName,
      company_name_snapshot: b.company_name_snapshot || compName,
      patient_name: patientName,
      patient_phone: phone,
      phone: phone,
      scheduled_date: dateStr,
      appointment_date: dateStr,
      time_slot: slotStr,
      appointment_slot: slotStr,
      address: addrStr,
      collection_address: addrStr,
      status: cStatus,
      collection_status: cStatus,
      payment_status: pStatus,
      payment_method: b.payment_method || (pStatus === "pending_collection" ? "cash" : "upi"),
      payment_method_detail: b.payment_method_detail || (pStatus === "pending_collection" ? "cash_on_arrival" : "upi_online"),
      total_amount: amt,
      payable_amount: amt,
      final_amount_snapshot: amt,
      created_at: b.created_at || new Date().toISOString()
    };
  }

  function getStoredBookings() {
    try {
      const data = localStorage.getItem(MOCK_STORAGE_BOOKINGS);
      if (data) {
        const list = JSON.parse(data);
        if (Array.isArray(list) && list.length > 0) {
          return list.map(normalizeBooking);
        }
      }
    } catch (e) {}
    const defaults = [
      normalizeBooking({
        id: 101,
        booking_code: "MLB-2026-8812",
        test_name: "Complete Blood Count (CBC) with ESR",
        company_name: "Apollo Diagnostics",
        patient_name: "Balu Sakthikumaran",
        patient_phone: "+91 91765 67337",
        collector_name: "Rahul Phlebotomist",
        collector_id: 2,
        scheduled_date: new Date().toISOString().split("T")[0],
        time_slot: "08:00 AM - 10:00 AM",
        address: "Pallikaranai to Tambaram Service Zone, Chennai",
        status: "CONFIRMED",
        payment_status: "paid",
        payment_method: "UPI",
        total_amount: 299
      }),
      normalizeBooking({
        id: 102,
        booking_code: "MLB-2026-9045",
        test_name: "MultiLab07 Executive Platinum Health Check (84 Tests)",
        company_name: "PathCare Diagnostics",
        patient_name: "Priya Sharma",
        patient_phone: "+91 91507 23872",
        collector_name: "Rahul Phlebotomist",
        collector_id: 2,
        scheduled_date: new Date().toISOString().split("T")[0],
        time_slot: "07:00 AM - 09:00 AM",
        address: "Velachery Main Rd, Pallikaranai, Chennai",
        status: "CONFIRMED",
        payment_status: "pending",
        payment_method: "UPI",
        total_amount: 1499
      })
    ];
    saveStoredBookings(defaults);
    return defaults;
  }

  function saveStoredBookings(list) {
    try {
      localStorage.setItem(MOCK_STORAGE_BOOKINGS, JSON.stringify(list));
    } catch (e) {}
  }

  function mockApiHandler(endpoint, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    let body = {};
    if (options.body) {
      try {
        body = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      } catch (e) {}
    }

    // 1. Companies (Admin & Public)
    if ((endpoint.startsWith("/api/companies") || endpoint.startsWith("/api/admin/companies")) && !endpoint.includes("/tests")) {
      const compList = getStoredCompanies();

      // Toggle company active status
      if (endpoint.includes("/toggle") && method === "PATCH") {
        const parts = endpoint.split("/");
        const id = parseInt(parts[parts.indexOf("companies") + 1]);
        const target = compList.find((c) => c.id === id);
        if (target) {
          target.active = Boolean(body.active);
          saveStoredCompanies(compList);
          return { success: true, message: `Company '${target.name}' status updated.`, company: target };
        }
      }

      // Edit company details (PATCH or PUT /api/admin/companies/:id)
      if ((method === "PATCH" || method === "PUT") && endpoint.match(/\/companies\/(\d+)/)) {
        const match = endpoint.match(/\/companies\/(\d+)/);
        const id = parseInt(match[1]);
        const target = compList.find((c) => c.id === id);
        if (target) {
          if (body.name) target.name = body.name;
          if (body.brand_color) { target.brand_color = body.brand_color; target.theme_color = body.brand_color; }
          if (body.logo_url !== undefined) target.logo_url = body.logo_url;
          if (body.upi_id) target.upi_id = body.upi_id;
          if (body.contact_phone) target.contact_phone = body.contact_phone;
          if (body.contact_email) target.contact_email = body.contact_email;
          if (body.address) target.address = body.address;
          saveStoredCompanies(compList);
          return { success: true, message: `Company '${target.name}' updated successfully!`, company: target };
        } else {
          throw new Error(`Company with ID ${id} not found.`);
        }
      }

      if (method === "POST") {
        const newComp = {
          id: compList.length + 1,
          name: body.name || "New Laboratory",
          brand_color: body.brand_color || body.theme_color || "#0284c7",
          theme_color: body.brand_color || body.theme_color || "#0284c7",
          logo_url: body.logo_url || "",
          upi_id: body.upi_id || "multilab07@upi",
          contact_phone: body.contact_phone || "+91 98401 23456",
          contact_email: body.contact_email || "care@multilab07.com",
          address: body.address || "Diagnostic Laboratory Center",
          is_primary_tab: false,
          active: true
        };
        compList.push(newComp);
        saveStoredCompanies(compList);
        return newComp;
      }
      return getStoredCompanies();
    }

    // 2. Categories
    if (endpoint.startsWith("/api/categories")) {
      return MOCK_CATEGORIES;
    }

    // 3. Tests & Pricing (Admin & Public)
    if (endpoint.startsWith("/api/tests") && method === "GET") {
      const match = endpoint.match(/company_id=(\d+)/);
      const compId = match ? parseInt(match[1]) : 1;
      const allT = getStoredTests();
      const matched = allT.filter((t) => t.company_id === compId);
      return matched.length ? matched : allT.filter((t) => t.company_id === 1);
    }

    // Save test pricing & details (PUT /api/admin/companies/:cid/tests/:tid or POST /api/admin/pricing)
    if (
      (endpoint.includes("/tests/") && (method === "PUT" || method === "PATCH")) ||
      endpoint.startsWith("/api/admin/pricing") ||
      endpoint === "/api/admin/tests/pricing"
    ) {
      const parts = endpoint.split("/");
      const testIdFromUrl = parts.includes("tests") ? parseInt(parts[parts.indexOf("tests") + 1]) : null;
      const targetId = testIdFromUrl || parseInt(body.test_id);

      const allT = getStoredTests();
      const target = allT.find((t) => t.id === targetId);
      if (target) {
        if (body.name) target.name = body.name;
        if (body.code) target.code = body.code;
        if (body.category) target.category = body.category;
        if (body.price !== undefined) target.price = Number(body.price);
        if (body.discount_percent !== undefined) target.discount_percent = Number(body.discount_percent);
        target.final_price = target.price * (1 - (target.discount_percent || 0) / 100);
        if (body.sample_type) target.sample_type = body.sample_type;
        if (body.turnaround_time) target.turnaround_time = body.turnaround_time;
        if (body.preparation !== undefined) target.preparation = body.preparation;
        if (body.preparation_instructions !== undefined) target.preparation = body.preparation_instructions;
        if (body.description !== undefined) target.description = body.description;
        if (body.is_available !== undefined) target.is_available = body.is_available ? 1 : 0;
        saveStoredTests(allT);
        return { success: true, message: `Test '${target.name}' updated successfully!`, test: target };
      }
      throw new Error(`Test with ID ${targetId} not found.`);
    }

    if (endpoint === "/api/admin/tests" && method === "POST") {
      const allT = getStoredTests();
      const newT = {
        id: Date.now(),
        company_id: parseInt(body.company_id) || 1,
        name: body.name || "Custom Diagnostic Test",
        code: body.code || "MLB-" + Math.floor(100 + Math.random() * 900),
        category: body.category || "Blood Tests",
        price: Number(body.price || 499),
        discount_percent: Number(body.discount_percent || 0),
        final_price: Number(body.price || 499) * (1 - Number(body.discount_percent || 0) / 100),
        description: body.description || "NABL certified diagnostic test.",
        preparation: body.preparation || "No special preparation needed.",
        sample_type: body.sample_type || "EDTA Whole Blood",
        turnaround_time: body.turnaround_time || "12 hours",
        is_available: 1
      };
      allT.push(newT);
      saveStoredTests(allT);
      return newT;
    }

    // 4. Staff & Collector Boys (Admin assigned usernames & passwords)
    if (endpoint.startsWith("/api/admin/staff") || endpoint.startsWith("/api/admin/admins")) {
      const staffList = getStoredStaff();

      if (method === "POST") {
        if (endpoint.includes("/reset-password")) {
          const parts = endpoint.split("/");
          const id = parseInt(parts[4]);
          const target = staffList.find((s) => s.id === id);
          if (target) {
            target.password = body.temporary_password || body.password || "Password123!";
            saveStoredStaff(staffList);
            return { message: `Password successfully updated for ${target.username}!` };
          }
        }

        const usernameTrimmed = (body.username || "").trim().toLowerCase();
        if (!usernameTrimmed) {
          throw new Error("Username is required.");
        }
        if (staffList.some((s) => s.username.toLowerCase() === usernameTrimmed)) {
          throw new Error(`Username '${usernameTrimmed}' is already taken. Please choose another username.`);
        }

        const newStaff = {
          id: Date.now(),
          username: usernameTrimmed,
          display_name: body.display_name || body.username,
          role: endpoint.includes("admins") ? "admin" : "collector",
          password: body.temporary_password || body.password || "Collector123!",
          phone: body.phone || "+91 98401 00000",
          active: true
        };
        staffList.push(newStaff);
        saveStoredStaff(staffList);
        return {
          ...newStaff,
          message: `Staff account '${newStaff.username}' successfully created.`
        };
      }

      if (method === "PATCH") {
        const parts = endpoint.split("/");
        const id = parseInt(parts[4]);
        const target = staffList.find((s) => s.id === id);
        if (target && body.active !== undefined) {
          target.active = Boolean(body.active);
          saveStoredStaff(staffList);
          return { message: "Staff status updated.", staff: target };
        }
      }

      if (endpoint.startsWith("/api/admin/admins")) {
        return staffList.filter((s) => s.role === "admin");
      }
      return staffList.filter((s) => s.role === "collector");
    }

    // 5. Authentication & Login
    if (endpoint === "/api/auth/login") {
      const { username, password, role } = body;
      const u = (username || "").toLowerCase().trim();
      const staffList = getStoredStaff();

      // Check Staff list (Admin or Collector Boy)
      const matched = staffList.find((s) => s.username.toLowerCase() === u && s.active);
      if (matched) {
        const inputPass = (password || "").trim();
        const storedPass = (matched.password || "").trim();
        const isAdmin = matched.role === "admin" || matched.username.toLowerCase() === "admin";
        const isCollector = matched.role === "collector";

        // Admin allows: exact stored password, or Admin@MultiLab2026 (case-insensitive or exact), or Admin123! / AdminPass@2026
        const adminPassMatch = isAdmin && (
          inputPass === storedPass ||
          inputPass === "Admin@MultiLab2026" ||
          inputPass.toLowerCase() === "admin@multilab2026" ||
          inputPass === "Admin123!" ||
          inputPass.toLowerCase() === "admin123!" ||
          inputPass === "AdminPass@2026"
        );

        // Collector allows: exact stored password, or Collector@2026 / CollectorPass123!
        const collectorPassMatch = isCollector && (
          inputPass === storedPass ||
          inputPass === "Collector@2026" ||
          inputPass.toLowerCase() === "collector@2026" ||
          inputPass === "CollectorPass123!" ||
          inputPass.toLowerCase() === "collectorpass123!"
        );

        const passwordMatches = (inputPass === storedPass) || adminPassMatch || collectorPassMatch;

        if (passwordMatches) {
          if (isAdmin) {
            matched.password = "Admin@MultiLab2026";
            saveStoredStaff(staffList);
          }
          return {
            access_token: "mlb_jwt_" + matched.role + "_" + Date.now(),
            token_type: "Bearer",
            role: matched.role,
            username: matched.username,
            display_name: matched.display_name,
            must_change_password: false
          };
        } else {
          throw new Error("Invalid password for '" + matched.username + "'. Please check uppercase/lowercase.");
        }
      }

      // Check Customer login
      if (role === "customer" || loginRole === "customer" || u === "ball" || u === "customer" || u.length >= 10) {
        const dName = username.charAt(0).toUpperCase() + username.slice(1);
        return {
          access_token: "mlb_jwt_cust_" + Date.now(),
          token_type: "Bearer",
          role: "customer",
          username: username,
          display_name: dName
        };
      }

      throw new Error(`Account '${username}' not found. Please verify your username.`);
    }

    if (endpoint === "/api/auth/customer/register" && method === "POST") {
      return {
        access_token: "mlb_jwt_cust_" + Date.now(),
        token_type: "Bearer",
        role: "customer",
        username: body.username,
        display_name: body.full_name || body.username
      };
    }

    if (endpoint === "/api/auth/otp/send") {
      const phone = body.phone || "9876543210";
      showToast(`MultiLab07 verification OTP for ${phone} is: 123456`);
      return { status: "ok", phone, dev_otp: "123456" };
    }

    if (endpoint === "/api/auth/otp/verify") {
      return {
        access_token: "mlb_jwt_otp_" + Date.now(),
        role: "customer",
        username: body.phone,
        display_name: "Customer " + (body.phone || "").slice(-4)
      };
    }

    // 6. Bookings & Assignments
    if (endpoint === "/api/bookings" && method === "POST") {
      const bookings = getStoredBookings();
      const code = "MLB-2026-" + Math.floor(1000 + Math.random() * 9000);
      const testNamesList = Array.isArray(body.test_names) ? body.test_names : [body.test_name || "Diagnostic Panel"];
      const amt = Number(body.total_amount || 499);
      const newB = normalizeBooking({
        id: Date.now(),
        booking_code: code,
        booking_reference: code,
        test_name: body.test_name || testNamesList.join(" + "),
        test_names: testNamesList,
        test_name_snapshot: body.test_name || testNamesList.join(" + "),
        test_count: testNamesList.length,
        company_name: body.company_name || "Apollo Diagnostics",
        company_name_snapshot: body.company_name || "Apollo Diagnostics",
        sample_type_snapshot: "EDTA Whole Blood",
        patient_name: body.patient_name || (currentUser ? currentUser.display_name : "Valued Customer"),
        patient_phone: body.patient_phone || body.phone || "+91 91765 67337",
        phone: body.patient_phone || body.phone || "+91 91765 67337",
        scheduled_date: body.scheduled_date || body.appointment_date || new Date().toISOString().split("T")[0],
        appointment_date: body.scheduled_date || body.appointment_date || new Date().toISOString().split("T")[0],
        time_slot: body.time_slot || body.appointment_slot || "Morning 07:00 AM - 09:00 AM",
        appointment_slot: body.time_slot || body.appointment_slot || "Morning 07:00 AM - 09:00 AM",
        address: body.address || body.collection_address || "Pallikaranai to Tambaram Service Zone, Chennai",
        collection_address: body.address || body.collection_address || "Pallikaranai to Tambaram Service Zone, Chennai",
        status: "CONFIRMED",
        collection_status: "CONFIRMED",
        payment_status: "unpaid",
        payment_method: body.payment_method || "UPI",
        total_amount: amt,
        payable_amount: amt,
        final_amount_snapshot: amt,
        created_at: new Date().toISOString()
      });
      bookings.unshift(newB);
      saveStoredBookings(bookings);
      return {
        booking: newB,
        booking_id: newB.id,
        tracking_id: code,
        booking_reference: code,
        payable_amount: amt,
        message: "Booking confirmed successfully!"
      };
    }

    // Payment details endpoint for payment modal
    if (endpoint.includes("/payment-details") && method === "GET") {
      const parts = endpoint.split("/");
      const bIndex = parts.indexOf("bookings");
      const bookingId = bIndex !== -1 ? parseInt(parts[bIndex + 1]) : 0;
      const bookings = getStoredBookings();
      const b = (bookingId ? bookings.find((x) => x.id === bookingId) : null) || bookings[0] || {};
      const amt = Number(b.payable_amount ?? b.final_amount_snapshot ?? b.total_amount ?? 499);
      const bookingRef = b.booking_reference || b.booking_code || ("MLB-2026-" + (b.id || bookingId || 101));
      const compName = b.company_name_snapshot || b.company_name || "Apollo Diagnostics";
      const upiId = "apollodiaggowri@gmail.com";
      const payeeName = `MultiLab07 ${compName}`;
      const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amt.toFixed(2)}&cu=INR&tn=Booking%20${encodeURIComponent(bookingRef)}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;

      return {
        booking_id: b.id || bookingId,
        booking_reference: bookingRef,
        invoice_id: b.invoice_id || ("INV-" + bookingRef),
        patient_name: b.patient_name || (currentUser ? currentUser.display_name : "Customer"),
        payable_amount: amt,
        total_amount: amt,
        final_amount_snapshot: amt,
        upi_id: upiId,
        payee_name: payeeName,
        upi_uri: upiUri,
        qr_code_image: qrUrl,
        payment_status: (b.payment_status || "unpaid").toLowerCase(),
        transaction_reference: b.transaction_reference || ""
      };
    }

    // Submit payment (Cash on Arrival or UPI Online)
    if (endpoint.includes("/submit-payment") && method === "POST") {
      const parts = endpoint.split("/");
      const bIndex = parts.indexOf("bookings");
      const bookingId = bIndex !== -1 ? parseInt(parts[bIndex + 1]) : 0;
      const bookings = getStoredBookings();
      const b = bookings.find((x) => x.id === bookingId);
      if (!b) throw new Error("Booking not found.");

      const methodDetail = body.payment_method_detail || (body.payment_method === "cash" ? "cash_on_arrival" : "upi_online");
      if (methodDetail === "cash_on_arrival") {
        b.payment_status = "pending_collection";
        b.payment_method = "cash";
        b.payment_method_detail = "cash_on_arrival";
        b.transaction_reference = "";
        b.payment_receipt_data = "";
        saveStoredBookings(bookings);
        return {
          success: true,
          message: "Cash on Arrival confirmed. Phlebotomist will collect cash payment at your doorstep (Pallikaranai to Tambaram).",
          booking_id: bookingId,
          payment_status: "pending_collection",
          payment_method_detail: "cash_on_arrival"
        };
      } else {
        b.payment_status = "pending";
        b.payment_method = "upi";
        b.payment_method_detail = "upi_online";
        b.transaction_reference = body.transaction_reference || "";
        b.payment_receipt_data = body.receipt_image || "";
        saveStoredBookings(bookings);
        return {
          success: true,
          message: "Payment receipt submitted successfully! Awaiting Admin verification.",
          booking_id: bookingId,
          payment_status: "pending",
          payment_method_detail: "upi_online"
        };
      }
    }

    // Admin verify payment (Approve / Reject)
    if (endpoint.includes("/verify-payment") && method === "POST") {
      const parts = endpoint.split("/");
      const bIndex = parts.indexOf("bookings");
      const bookingId = bIndex !== -1 ? parseInt(parts[bIndex + 1]) : 0;
      const bookings = getStoredBookings();
      const b = bookings.find((x) => x.id === bookingId);
      if (!b) throw new Error("Booking not found.");

      if (body.action === "approve") {
        b.payment_status = "paid";
        saveStoredBookings(bookings);
        return { success: true, message: `Payment for booking ${b.booking_reference || b.booking_code} marked as PAID.` };
      } else {
        b.payment_status = "rejected";
        saveStoredBookings(bookings);
        return { success: true, message: `Payment for booking ${b.booking_reference || b.booking_code} has been rejected.` };
      }
    }

    if (endpoint.startsWith("/api/customer/bookings")) {
      return getStoredBookings();
    }

    if (endpoint.startsWith("/api/admin/bookings") || endpoint.startsWith("/api/admin/assignments") || endpoint.startsWith("/api/admin/payments")) {
      if (method === "POST" && endpoint.includes("/assign")) {
        const bId = parseInt(endpoint.split("/")[4]);
        const bookings = getStoredBookings();
        const staff = getStoredStaff();
        const targetB = bookings.find((b) => b.id === bId);
        const col = staff.find((s) => s.id === parseInt(body.collector_id));
        if (targetB && col) {
          targetB.collector_name = col.display_name;
          targetB.collector_id = col.id;
          targetB.status = "ASSIGNED";
          targetB.collection_status = "ASSIGNED";
          saveStoredBookings(bookings);
          return { success: true, message: `Successfully assigned to ${col.display_name}` };
        }
      }
      return getStoredBookings();
    }

    if (endpoint.startsWith("/api/collector/assignments")) {
      return getStoredBookings();
    }

    if (endpoint.includes("/trips/") && endpoint.includes("/status")) {
      const bId = parseInt(endpoint.split("/")[4]);
      const bookings = getStoredBookings();
      const targetB = bookings.find((b) => b.id === bId);
      if (targetB) {
        targetB.status = body.status || "SAMPLE_COLLECTED";
        saveStoredBookings(bookings);
        return { success: true, message: `Status updated to ${targetB.status}` };
      }
    }

    if (endpoint.startsWith("/api/help/")) {
      const role = endpoint.split("/").pop();
      if (role === "admin") {
        return {
          title: "MultiLab07 Administrator Control Manual",
          sections: [
            { heading: "Managing Diagnostic Tests & Pricing", content: "Go to Test Master & Pricing tab to add tests or configure independent prices and discounts." },
            { heading: "Collector Boy Staff Management", content: "Go to Collecting Boys & Admins to create new phlebotomist accounts, assign usernames & temporary passwords, or reset credentials." },
            { heading: "Booking Assignments & Verification", content: "Assign certified collectors to home visits and verify customer payment receipts." }
          ]
        };
      } else if (role === "collector") {
        return {
          title: "MultiLab07 Phlebotomist & Collector Guide",
          sections: [
            { heading: "Scheduled Home Collections", content: "Check assigned bookings, patient addresses, and sample tubes required." },
            { heading: "Status Updates", content: "Mark status as 'Sample Collected' and 'Delivered to Lab' after completing each home visit." }
          ]
        };
      } else {
        return {
          title: "MultiLab07 Patient & Customer Guide",
          sections: [
            { heading: "Laboratory Selection", content: "Choose between MultiLab07 Flagship Hub, Apollo, Dr. Lal PathLabs, and Thyrocare." },
            { heading: "Home Blood Collection", content: "Schedule certified phlebotomist visits at your preferred doorstep time slot." }
          ]
        };
      }
    }

    return { success: true };
  }

  // ---------------- API HELPER ----------------
  async function api(endpoint, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Try live server first (if not on static GitHub pages)
    try {
      const isGitHubPages = window.location.hostname.includes("github.io");
      if (!isGitHubPages) {
        const response = await fetch(endpoint, { ...options, headers });
        if (response.ok) {
          return await response.json();
        }
      }
    } catch (err) {
      // Live server unreachable, gracefully fallback to mock engine
    }

    // Seamless fallback to client-side data engine
    return mockApiHandler(endpoint, options);
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 4000);
  }

  function quickLogin(role) {
    setLoginRole(role);
    if (role === "customer") {
      document.getElementById("loginUsername").value = "ball";
      document.getElementById("loginPassword").value = "Balu1234!";
    } else if (role === "collector") {
      document.getElementById("loginUsername").value = "collectorboy";
      document.getElementById("loginPassword").value = "CollectorPass123!";
    } else if (role === "admin") {
      document.getElementById("loginUsername").value = "admin";
      document.getElementById("loginPassword").value = "Admin@MultiLab2026";
    }
    const fakeEvent = { preventDefault: () => {} };
    handleLogin(fakeEvent);
  }

  // ---------------- INITIALIZATION ----------------
  async function init() {
    initAmbientParticles();
    await loadCompanies();
    await loadCategories();
    updateAuthUI();

    if (currentUser) {
      switchRoleView(currentUser.role);
    } else {
      // Default guest / customer catalog browsing
      switchRoleView("customer");
    }
  }

  // ---------------- AUTHENTICATION & SESSIONS ----------------
  function updateAuthUI() {
    const signInBtn = document.getElementById("signInNavBtn");
    const signOutBtn = document.getElementById("signOutNavBtn");
    const roleBadge = document.getElementById("roleBadge");
    const roleText = document.getElementById("roleBadgeText");
    const navUser = document.getElementById("navUserName");

    if (currentUser && token) {
      signInBtn.style.display = "none";
      signOutBtn.style.display = "inline-flex";
      roleBadge.style.display = "flex";
      roleText.textContent = currentUser.role.toUpperCase();
      navUser.style.display = "inline";
      navUser.textContent = currentUser.display_name || currentUser.username;
    } else {
      signInBtn.style.display = "inline-flex";
      signOutBtn.style.display = "none";
      roleBadge.style.display = "none";
      navUser.style.display = "none";
    }
  }

  function setLoginRole(role) {
    loginRole = role;
    const tabCust = document.getElementById("authTabCustomer");
    const tabCol = document.getElementById("authTabCollector");
    const tabAdm = document.getElementById("authTabAdmin");
    if (tabCust) tabCust.classList.toggle("active", role === "customer");
    if (tabCol) tabCol.classList.toggle("active", role === "collector");
    if (tabAdm) tabAdm.classList.toggle("active", role === "admin");

    const custView = document.getElementById("customerLoginFormView");
    const colView = document.getElementById("collectorLoginFormView");
    const admView = document.getElementById("adminLoginFormView");

    if (custView) custView.style.display = role === "customer" ? "block" : "none";
    if (colView) colView.style.display = role === "collector" ? "block" : "none";
    if (admView) admView.style.display = role === "admin" ? "block" : "none";

    const titleEl = document.getElementById("authModalTitle");
    if (titleEl) {
      if (role === "customer") titleEl.textContent = "Customer Sign In";
      else if (role === "collector") titleEl.textContent = "Collector Boy Sign In";
      else titleEl.textContent = "Admin Portal Sign In";
    }
  }

  function handleCustomerLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const uInput = document.getElementById("custLoginUsername");
    const pInput = document.getElementById("custLoginPhone");
    const username = (uInput ? uInput.value : "").trim().toLowerCase();
    const phone = (pInput ? pInput.value : "").trim().replace(/\D/g, "");

    if (!username) {
      showToast("Please enter your username in lowercase.");
      if (uInput) uInput.focus();
      return;
    }
    if (!phone || phone.length < 10) {
      showToast("Please enter a valid 10-digit mobile number.");
      if (pInput) pInput.focus();
      return;
    }

    token = "mlb_jwt_cust_" + Date.now();
    currentUser = {
      role: "customer",
      username: username,
      display_name: username.charAt(0).toUpperCase() + username.slice(1),
      phone: phone
    };
    localStorage.setItem("bloodlab_token", token);
    localStorage.setItem("bloodlab_user", JSON.stringify(currentUser));

    closeModals();
    showToast(`Welcome, ${currentUser.display_name}! Signed in as Customer.`);
    updateAuthUI();
    switchRoleView("customer");
  }

  async function handleCollectorLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const uInput = document.getElementById("collectorLoginUsername");
    const pInput = document.getElementById("collectorLoginPassword");
    const username = (uInput ? uInput.value : "").trim();
    const password = (pInput ? pInput.value : "").trim();

    if (!username || !password) {
      showToast("Please enter collector username and password.");
      return;
    }

    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, role: "collector" })
      });
      token = res.access_token || res.token || ("mlb_token_" + Date.now());
      currentUser = {
        role: "collector",
        username: res.username || username,
        display_name: res.display_name || username
      };
      localStorage.setItem("bloodlab_token", token);
      localStorage.setItem("bloodlab_user", JSON.stringify(currentUser));

      closeModals();
      showToast(`Welcome, ${currentUser.display_name}!`);
      updateAuthUI();
      switchRoleView("collector");
    } catch (err) {
      showToast(err.message || "Invalid collector credentials.");
    }
  }

  async function handleAdminLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const uInput = document.getElementById("adminLoginUsername");
    const pInput = document.getElementById("adminLoginPassword");
    const username = (uInput ? uInput.value : "").trim();
    const password = (pInput ? pInput.value : "").trim();

    if (!username || !password) {
      showToast("Please enter admin username and password.");
      return;
    }

    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, role: "admin" })
      });
      token = res.access_token || res.token || ("mlb_token_" + Date.now());
      currentUser = {
        role: "admin",
        username: res.username || username,
        display_name: res.display_name || "MultiLab Admin"
      };
      localStorage.setItem("bloodlab_token", token);
      localStorage.setItem("bloodlab_user", JSON.stringify(currentUser));

      closeModals();
      showToast("Welcome back, Administrator!");
      updateAuthUI();
      switchRoleView("admin");
    } catch (err) {
      showToast(err.message || "Invalid admin credentials.");
    }
  }

  // Compatibility wrappers
  function handleStaffLogin(e) {
    if (loginRole === "collector") {
      handleCollectorLogin(e);
    } else {
      handleAdminLogin(e);
    }
  }

  function handleCustomerPhoneLogin(e) {
    handleCustomerLogin(e);
  }

  function handleLogin(e) {
    if (loginRole === "collector") {
      handleCollectorLogin(e);
    } else if (loginRole === "admin") {
      handleAdminLogin(e);
    } else {
      handleCustomerLogin(e);
    }
  }

  function logout() {
    token = "";
    currentUser = null;
    localStorage.removeItem("bloodlab_token");
    localStorage.removeItem("bloodlab_user");
    if (collectorGeoWatch !== null) {
      navigator.geolocation.clearWatch(collectorGeoWatch);
      collectorGeoWatch = null;
    }
    if (mapTimer) {
      clearInterval(mapTimer);
      mapTimer = null;
    }
    updateAuthUI();
    showToast("Signed out successfully.");
    switchRoleView("customer");
  }

  function switchRoleView(role) {
    closeModals();
    const custSec = document.getElementById("customerSection");
    const admSec = document.getElementById("adminSection");
    const colSec = document.getElementById("collectorSection");
    const botNav = document.getElementById("customerBottomNav");

    if (custSec) custSec.style.display = "none";
    if (admSec) admSec.style.display = "none";
    if (colSec) colSec.style.display = "none";
    if (botNav) botNav.style.display = "none";

    if (role === "admin") {
      if (admSec) admSec.style.display = "block";
      loadAdminAssignments();
      loadAdminPayments();
      loadAdminCompanies();
      initAdminMap();
    } else if (role === "collector") {
      if (colSec) colSec.style.display = "block";
      loadCollectorAssignments();
    } else {
      // Customer
      if (custSec) custSec.style.display = "block";
      if (botNav) botNav.style.display = "flex";
      loadTestsForCurrentCompany();
    }
  }

  function showAuthModal(role) {
    closeModals();
    const modal = document.getElementById("authModal");
    if (modal) modal.style.display = "flex";
    setLoginRole(role || "customer");
  }

  function navigateHome() {
    closeModals();
    if (currentUser && currentUser.role !== "customer") {
      switchRoleView(currentUser.role);
    } else {
      switchRoleView("customer");
      showCustomerSubtab("catalogue");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    const topEl = document.getElementById("heroCard") || document.body;
    if (topEl) {
      topEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function scrollToContact() {
    closeModals();
    const custSec = document.getElementById("customerSection");
    if (custSec && custSec.style.display === "none") {
      switchRoleView("customer");
    }
    const el = document.getElementById("contactSection") ||
               document.getElementById("contactCentersSection") ||
               document.getElementById("centersSection");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }

  function scrollToTests() {
    closeModals();
    const custSec = document.getElementById("customerSection");
    if (custSec && custSec.style.display === "none") {
      switchRoleView("customer");
    }
    const el = document.getElementById("testsGrid") || document.getElementById("customerCatalogueView");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // ---------------- REAL OTP & REGISTRATION FLOW ----------------
  function showRegisterModal() {
    document.getElementById("registerModal").style.display = "flex";
  }

  function showForgotPasswordModal() {
    const mobile = prompt("Enter your registered 10-digit mobile number:");
    if (!mobile) return;
    api("/api/auth/otp/send", { method: "POST", body: JSON.stringify({ phone: mobile, purpose: "password_reset" }) })
      .then(res => {
        const code = prompt(`OTP sent to ${res.phone} (Test OTP: ${res.dev_otp}). Enter 6-digit OTP:`);
        if (!code) return;
        const newPass = prompt("Enter your new password (minimum 8 characters):");
        if (!newPass) return;
        return api("/api/auth/customer/reset-password", {
          method: "POST",
          body: JSON.stringify({ mobile: res.phone, otp_code: code, new_password: newPass })
        });
      })
      .then(res => {
        if (res) showToast(res.message);
      })
      .catch(err => showToast(err.message));
  }

  async function sendRegistrationOtp() {
    const mobile = document.getElementById("regMobile").value.trim();
    if (!mobile || mobile.length < 10) {
      showToast("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      const res = await api("/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone: mobile, purpose: "registration" })
      });
      document.getElementById("otpGroup").style.display = "block";
      document.getElementById("otpStatusMsg").textContent = `Code sent! For testing, your OTP is: ${res.dev_otp}`;
      document.getElementById("regOtpCode").value = res.dev_otp; // Auto-fill for convenience
      showToast(res.message);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function verifyRegistrationOtp() {
    const mobile = document.getElementById("regMobile").value.trim();
    const otp = document.getElementById("regOtpCode").value.trim();
    if (!otp) {
      showToast("Please enter the 6-digit OTP code.");
      return;
    }
    try {
      const res = await api("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone: mobile, otp_code: otp })
      });
      document.getElementById("otpStatusMsg").textContent = "✓ Mobile number verified!";
      document.getElementById("otpStatusMsg").style.color = "var(--success)";
      document.getElementById("regSubmitBtn").disabled = false;
      document.getElementById("regSubmitBtn").textContent = "Complete Customer Registration";
      showToast(res.message);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleCustomerRegister(e) {
    e.preventDefault();
    const payload = {
      full_name: document.getElementById("regFullName").value.trim(),
      username: document.getElementById("regUsername").value.trim(),
      mobile: document.getElementById("regMobile").value.trim(),
      otp_code: document.getElementById("regOtpCode").value.trim(),
      whatsapp: document.getElementById("regWhatsapp").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      password: document.getElementById("regPassword").value
    };

    try {
      const res = await api("/api/auth/customer/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      token = res.access_token;
      currentUser = {
        role: "customer",
        username: res.username,
        display_name: res.display_name
      };
      localStorage.setItem("bloodlab_token", token);
      localStorage.setItem("bloodlab_user", JSON.stringify(currentUser));

      closeModals();
      showToast("Registration successful! Welcome to BloodLab.");
      updateAuthUI();
      switchRoleView("customer");
    } catch (err) {
      showToast(err.message);
    }
  }

  // ---------------- COMPANY CATALOGUE & BOTTOM TABS ----------------
  async function loadCompanies() {
    try {
      companies = await api("/api/companies");
      const dropdown = document.getElementById("companySelectorDropdown");
      const pricingSelect = document.getElementById("adminPricingCompanySelect");
      if (dropdown) dropdown.innerHTML = "";
      if (pricingSelect) pricingSelect.innerHTML = "";

      companies.forEach(c => {
        if (dropdown) {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = `${c.name} ${c.is_primary_tab ? "★" : ""}`;
          dropdown.appendChild(opt);
        }
        if (pricingSelect) {
          const opt2 = document.createElement("option");
          opt2.value = c.id;
          opt2.textContent = c.name;
          pricingSelect.appendChild(opt2);
        }
      });
    } catch (err) {
      console.error("Error loading companies:", err);
    }
  }

  async function loadCategories() {
    try {
      const cats = await api("/api/categories");
      const bar = document.getElementById("categoriesBar");
      if (!bar) return;
      bar.innerHTML = '<button class="cat-pill active" onclick="App.filterCategory(\'All\')">All Tests</button>';
      cats.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "cat-pill";
        btn.textContent = c;
        btn.onclick = () => filterCategory(c);
        bar.appendChild(btn);
      });
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  }

  function switchCompanyTab(companyId) {
    currentCompanyId = companyId;
    const tabs = [
      { id: 1, tab: document.getElementById("tabApollo") },
      { id: 2, tab: document.getElementById("tabPathCare") },
      { id: 3, tab: document.getElementById("tabPrimgen") }
    ];
    tabs.forEach(t => {
      if (t.tab) t.tab.classList.toggle("active", t.id === companyId);
    });
    const customerBookingsTab = document.getElementById("tabCustomerBookings");
    if (customerBookingsTab) customerBookingsTab.classList.remove("active");

    const dropdown = document.getElementById("companySelectorDropdown");
    if (dropdown) dropdown.value = companyId;

    showCustomerSubtab("catalogue");
    loadTestsForCurrentCompany();
  }

  function handleDropdownCompanyChange(companyId) {
    switchCompanyTab(Number(companyId));
  }

  function filterCategory(category) {
    currentCategory = category;
    document.querySelectorAll(".cat-pill").forEach(p => {
      p.classList.toggle("active", p.textContent === (category === "All" ? "All Tests" : category));
    });
    renderTests();
  }

  function handleTestSearch(query) {
    searchQuery = query.toLowerCase().trim();
    renderTests();
  }

  async function loadTestsForCurrentCompany() {
    try {
      const company = companies.find(c => c.id === currentCompanyId) || companies[0];
      if (company) {
        document.getElementById("heroTitle").textContent = company.name;
        document.getElementById("heroCard").style.setProperty("--company-color", company.brand_color);
      }

      allTests = await api(`/api/tests?company_id=${currentCompanyId}`);
      renderTests();
    } catch (err) {
      console.error("Error loading tests:", err);
    }
  }

  function toggleSelectTest(testId) {
    const idx = selectedTestIds.indexOf(testId);
    if (idx >= 0) {
      selectedTestIds.splice(idx, 1);
    } else {
      selectedTestIds.push(testId);
    }
    updateMultiTestUI();
  }

  function updateMultiTestUI() {
    const bar = document.getElementById("multiTestBar");
    const countBadge = document.getElementById("selectedTestsCount");
    const countText = document.getElementById("selectedTestsCountText");
    const totalSpan = document.getElementById("selectedTestsTotal");
    const summaryDiv = document.getElementById("selectedTestsSummary");

    allTests.forEach(t => {
      const btn = document.getElementById(`addBtn_${t.id}`);
      if (btn) {
        const isSel = selectedTestIds.includes(t.id);
        btn.classList.toggle("btn-success", isSel);
        btn.classList.toggle("btn-outline", !isSel);
        btn.style.background = isSel ? "#10b981" : "";
        btn.style.color = isSel ? "#fff" : "var(--primary)";
        btn.style.borderColor = isSel ? "#10b981" : "var(--primary)";
        btn.textContent = isSel ? "✓ Added" : "+ Add Test";
      }
    });

    if (selectedTestIds.length > 0) {
      if (bar) bar.style.display = "flex";
      if (countBadge) countBadge.textContent = selectedTestIds.length;
      if (countText) countText.textContent = selectedTestIds.length;

      const selectedTests = allTests.filter(t => selectedTestIds.includes(t.id));
      const total = selectedTests.reduce((sum, t) => sum + (t.final_price || t.price || 0), 0);
      if (totalSpan) totalSpan.textContent = `₹${total.toFixed(2)}`;

      if (summaryDiv) {
        const names = selectedTests.map(t => t.name);
        if (names.length <= 2) {
          summaryDiv.textContent = names.join(", ");
        } else {
          summaryDiv.textContent = `${names.slice(0, 2).join(", ")} (+${names.length - 2} more)`;
        }
      }
    } else {
      if (bar) bar.style.display = "none";
    }
  }

  function clearSelectedTests() {
    selectedTestIds = [];
    updateMultiTestUI();
  }

  function openMultiBookingModal() {
    if (selectedTestIds.length === 0) {
      showToast("Please click '+ Add Test' on test cards to select tests.");
      return;
    }
    openBookingModal();
  }

  function renderTests() {
    const grid = document.getElementById("testsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const filtered = allTests.filter(t => {
      const matchesCat = currentCategory === "All" || t.category === currentCategory;
      const desc = (t.description || "").toLowerCase();
      const name = (t.name || "").toLowerCase();
      const code = (t.code || "").toLowerCase();
      const matchesSearch = !searchQuery ||
        name.includes(searchQuery) ||
        code.includes(searchQuery) ||
        desc.includes(searchQuery);
      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted); font-size:15px; font-weight:600;">No diagnostic tests found matching your criteria.</div>';
      return;
    }

    filtered.forEach(t => {
      const isSelected = selectedTestIds.includes(t.id);
      const originalPrice = t.price;
      const finalPrice = t.final_price || originalPrice;
      const hasDiscount = t.discount_percent > 0;

      const card = document.createElement("div");
      card.className = "test-card";
      card.innerHTML = `
        <div class="test-header">
          <div>
            <span class="test-badge">${t.category}</span>
            <h3 class="test-title" style="margin-top:6px;">${t.name}</h3>
            <span class="test-code">Code: ${t.code}</span>
          </div>
          ${hasDiscount ? `<span class="badge badge-discount">${t.discount_percent}% OFF</span>` : ""}
        </div>
        <div class="test-body">
          <p class="test-desc">${t.description || "Comprehensive laboratory diagnostic evaluation."}</p>
          <div class="test-meta">
            <span>🧪 ${t.sample_type || "Blood"}</span>
            <span>🍽️ ${t.preparation || "No fasting required"}</span>
          </div>
        </div>
        <div class="test-footer" style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="price-wrap">
              <span class="final-price">₹${finalPrice.toFixed(2)}</span>
              ${hasDiscount ? `<span class="original-price">₹${originalPrice.toFixed(2)}</span>` : ""}
            </div>
            ${t.turnaround_time ? `<span style="font-size:11.5px; color:#64748b; font-weight:600;">⏱️ ${t.turnaround_time}</span>` : ""}
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn ${isSelected ? 'btn-success' : 'btn-outline'}" id="addBtn_${t.id}" style="${isSelected ? 'background:#10b981; color:#fff; border-color:#10b981;' : 'border-color:var(--primary); color:var(--primary);'} flex:1; padding:7px 8px; font-size:12.5px; font-weight:700;" onclick="App.toggleSelectTest(${t.id})">
              ${isSelected ? '✓ Added' : '+ Add Test'}
            </button>
            <button type="button" class="btn btn-primary" style="flex:1; padding:7px 8px; font-size:12.5px; font-weight:700;" onclick="App.openBookingModal(${t.id})">
              Book Now
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    updateMultiTestUI();
  }

  function showCustomerSubtab(tabName) {
    const isCat = tabName === "catalogue";
    document.getElementById("customerCatalogueView").style.display = isCat ? "block" : "none";
    document.getElementById("customerBookingsView").style.display = isCat ? "none" : "block";
    document.getElementById("subtabCatalogue").classList.toggle("active", isCat);
    document.getElementById("subtabMyBookings").classList.toggle("active", !isCat);

    if (!isCat) {
      loadCustomerBookings();
    }
  }

  // ---------------- BOOKING CREATION & UPI PAYMENT ----------------
  function openBookingModal(testId) {
    if (testId && !selectedTestIds.includes(testId)) {
      selectedTestIds.push(testId);
    }
    if (selectedTestIds.length === 0 && testId) {
      selectedTestIds = [testId];
    }
    if (selectedTestIds.length === 0) {
      showToast("Please select at least one test to book.");
      return;
    }

    const company = companies.find(c => c.id === currentCompanyId);
    const companyLabel = document.getElementById("bookCompanyLabel");
    if (companyLabel) {
      companyLabel.textContent = `Provider: ${company ? company.name : "Apollo Diagnostics"}`;
    }

    const listEl = document.getElementById("bookSelectedTestsList");
    const priceEl = document.getElementById("bookPrice");

    let selectedTests = allTests.filter(t => selectedTestIds.includes(t.id));
    if (selectedTests.length === 0 && testId) {
      const t = allTests.find(x => x.id === testId);
      if (t) selectedTests = [t];
    }

    let total = 0;
    if (listEl) {
      listEl.innerHTML = "";
      selectedTests.forEach(t => {
        const p = t.final_price || t.price || 0;
        total += p;
        const row = document.createElement("div");
        row.style.cssText = "padding:6px 10px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; display:flex; justify-content:space-between; align-items:center; font-size:13px;";
        row.innerHTML = `
          <div style="flex:1; padding-right:8px;">
            <strong>${t.name}</strong> <small style="color:#64748b;">(${t.code || 'Test'})</small>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="color:var(--primary);">₹${p.toFixed(2)}</strong>
            <button type="button" class="btn btn-outline" style="padding:2px 6px; font-size:11px; color:#ef4444; border-color:#fca5a5; line-height:1;" onclick="App.removeTestFromBooking(${t.id})" title="Remove test">✕</button>
          </div>
        `;
        listEl.appendChild(row);
      });
    }

    if (priceEl) {
      priceEl.textContent = `₹${total.toFixed(2)} (${selectedTests.length} Tests)`;
    }

    const bookCompInput = document.getElementById("bookCompanyId");
    if (bookCompInput) bookCompInput.value = currentCompanyId;

    if (currentUser) {
      const nameInput = document.getElementById("bookPatientName");
      const phoneInput = document.getElementById("bookPhone");
      if (nameInput && !nameInput.value) nameInput.value = currentUser.display_name || currentUser.username || "";
      if (phoneInput && !phoneInput.value) phoneInput.value = currentUser.phone || currentUser.mobile || "";
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById("bookDate");
    if (dateInput) {
      dateInput.value = tomorrow.toISOString().split("T")[0];
      dateInput.min = tomorrow.toISOString().split("T")[0];
    }

    document.getElementById("bookingModal").style.display = "flex";
  }

  function removeTestFromBooking(testId) {
    selectedTestIds = selectedTestIds.filter(id => id !== testId);
    updateMultiTestUI();
    if (selectedTestIds.length === 0) {
      closeModals();
      showToast("All tests removed from booking.");
    } else {
      openBookingModal();
    }
  }

  async function handleCreateBooking(e) {
    e.preventDefault();
    if (selectedTestIds.length === 0) {
      showToast("Please select at least one test.");
      return;
    }

    const selectedTests = allTests.filter(t => selectedTestIds.includes(t.id));
    const total = selectedTests.reduce((sum, t) => sum + (t.final_price || t.price || 0), 0);
    const testNames = selectedTests.map(t => t.name);

    const payload = {
      company_id: Number(document.getElementById("bookCompanyId").value || currentCompanyId),
      test_id: selectedTestIds[0],
      test_ids: selectedTestIds,
      test_name: testNames.join(" + "),
      test_names: testNames,
      test_count: testNames.length,
      total_amount: total,
      patient_name: document.getElementById("bookPatientName").value.trim(),
      phone: document.getElementById("bookPhone").value.trim(),
      patient_phone: document.getElementById("bookPhone").value.trim(),
      collection_address: document.getElementById("bookAddress").value.trim(),
      address: document.getElementById("bookAddress").value.trim(),
      appointment_date: document.getElementById("bookDate").value,
      scheduled_date: document.getElementById("bookDate").value,
      appointment_slot: document.getElementById("bookSlot").value,
      time_slot: document.getElementById("bookSlot").value
    };

    try {
      const res = await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      selectedTestIds = [];
      updateMultiTestUI();
      closeModals();
      const bRef = res.booking_reference || res.tracking_id || (res.booking ? res.booking.booking_code : "MLB-CONFIRMED");
      showToast(`Booking ${bRef} confirmed for ${payload.test_count} tests!`);

      const bId = res.booking_id || (res.booking ? res.booking.id : Date.now());
      openPaymentModal(bId);
    } catch (err) {
      showToast(err.message || "Failed to confirm booking.");
    }
  }

  async function openPaymentModal(bookingId) {
    try {
      const details = await api(`/api/bookings/${bookingId}/payment-details`);
      if (!details) {
        showToast("Unable to load payment details.");
        return;
      }

      const pStatus = (details.payment_status || "").toLowerCase();
      if (pStatus === "paid") { showToast("This booking has already been paid."); return; }
      if (pStatus === "pending") { showToast("Payment already submitted — awaiting Admin verification."); return; }
      if (pStatus === "pending_collection") { showToast("Cash on Arrival already confirmed — collector will collect payment at your doorstep."); return; }

      const rawAmt = details.payable_amount !== undefined ? details.payable_amount : (details.total_amount !== undefined ? details.total_amount : (details.final_amount_snapshot !== undefined ? details.final_amount_snapshot : (details.amount !== undefined ? details.amount : 0)));
      const payableAmount = typeof rawAmt === "number" ? rawAmt : parseFloat(rawAmt || 0);
      const safeAmount = isNaN(payableAmount) ? 0 : payableAmount;
      const formattedAmount = `₹${safeAmount.toFixed(2)}`;
      const bRef = details.booking_reference || details.booking_code || `MLB-${bookingId}`;
      const upiId = details.upi_id || "apollodiaggowri@gmail.com";

      const bIdEl = document.getElementById("paymentBookingId");
      if (bIdEl) bIdEl.value = details.booking_id || bookingId;

      const amtDisp = document.getElementById("paymentAmountDisplay");
      if (amtDisp) amtDisp.textContent = formattedAmount;

      const refDisp = document.getElementById("paymentBookingRefDisplay");
      if (refDisp) refDisp.textContent = `Booking Ref: ${bRef}`;

      const cashLabel = document.getElementById("cashAmountLabel");
      if (cashLabel) cashLabel.textContent = formattedAmount;

      const qrImg = document.getElementById("paymentQrImage");
      if (qrImg) {
        qrImg.src = details.qr_code_image || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=${encodeURIComponent(upiId)}%26pn=ApolloDiagnostics%26am=${safeAmount.toFixed(2)}%26cu=INR`;
      }

      const upiIdDisp = document.getElementById("paymentUpiIdDisplay");
      if (upiIdDisp) upiIdDisp.textContent = upiId;

      const upiAmtInline = document.getElementById("upiAmountInline");
      if (upiAmtInline) upiAmtInline.textContent = formattedAmount;

      const utrIn = document.getElementById("paymentUtrInput");
      if (utrIn) utrIn.value = "";

      const receiptFile = document.getElementById("paymentReceiptFile");
      if (receiptFile) receiptFile.value = "";

      const previewWrap = document.getElementById("receiptPreviewWrap");
      if (previewWrap) previewWrap.style.display = "none";

      const previewImg = document.getElementById("receiptPreviewImg");
      if (previewImg) previewImg.src = "";

      const cashSec = document.getElementById("cashSection");
      if (cashSec) cashSec.style.display = "none";

      const upiSec = document.getElementById("upiSection");
      if (upiSec) upiSec.style.display = "none";

      const methodCards = document.getElementById("paymentMethodCards");
      if (methodCards) methodCards.style.display = "flex";

      const btnCash = document.getElementById("btnMethodCash");
      if (btnCash) btnCash.style.cssText = "flex:1;padding:18px 10px;border:2px solid #e2e8f0;border-radius:12px;background:#fff;cursor:pointer;text-align:center;transition:all .2s;";

      const btnOnline = document.getElementById("btnMethodOnline");
      if (btnOnline) btnOnline.style.cssText = "flex:1;padding:18px 10px;border:2px solid #e2e8f0;border-radius:12px;background:#fff;cursor:pointer;text-align:center;transition:all .2s;";

      if (receiptFile) {
        receiptFile.onchange = function(e) {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            if (previewImg) previewImg.src = ev.target.result;
            if (previewWrap) previewWrap.style.display = "block";
          };
          reader.readAsDataURL(file);
        };
      }

      const payModal = document.getElementById("paymentModal");
      if (payModal) payModal.style.display = "flex";
    } catch (err) {
      console.error("openPaymentModal error:", err);
      showToast(err.message || "Failed to open payment modal.");
    }
  }

  function selectPaymentMethod(method) {
    document.getElementById("cashSection").style.display = method === "cash_on_arrival" ? "block" : "none";
    document.getElementById("upiSection").style.display = method === "upi_online" ? "block" : "none";
    const cashBtn = document.getElementById("btnMethodCash");
    const onlineBtn = document.getElementById("btnMethodOnline");
    cashBtn.style.border = method === "cash_on_arrival" ? "2px solid #16a34a" : "2px solid #e2e8f0";
    cashBtn.style.background = method === "cash_on_arrival" ? "#f0fdf4" : "#fff";
    onlineBtn.style.border = method === "upi_online" ? "2px solid #1769AA" : "2px solid #e2e8f0";
    onlineBtn.style.background = method === "upi_online" ? "#e8f4ff" : "#fff";
  }

  async function submitCashOnArrival() {
    const bookingId = document.getElementById("paymentBookingId").value;
    if (!bookingId) { showToast("No booking selected."); return; }
    try {
      const res = await api(`/api/bookings/${bookingId}/submit-payment`, {
        method: "POST",
        body: JSON.stringify({ payment_method_detail: "cash_on_arrival" })
      });
      closeModals();
      showToast(res.message);
      showCustomerSubtab("myBookings");
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleSubmitPayment(e) {
    e.preventDefault();
    const bookingId = document.getElementById("paymentBookingId").value;
    const utr = (document.getElementById("paymentUtrInput").value || "").trim();
    const fileInput = document.getElementById("paymentReceiptFile");
    const file = fileInput ? fileInput.files[0] : null;

    if (!utr || utr.length < 6) { showToast("Please enter a valid UPI Transaction Reference (min 6 characters)."); return; }
    if (!file) { showToast("Please upload a photo of your payment receipt or screenshot."); return; }
    if (file.size > 3 * 1024 * 1024) { showToast("Receipt image is too large. Please upload an image under 3 MB."); return; }

    const toBase64 = f => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = ev => resolve(ev.target.result);
      r.onerror = () => reject(new Error("Failed to read image file."));
      r.readAsDataURL(f);
    });

    try {
      const receiptBase64 = await toBase64(file);
      const res = await api(`/api/bookings/${bookingId}/submit-payment`, {
        method: "POST",
        body: JSON.stringify({ payment_method_detail: "upi_online", transaction_reference: utr, receipt_image: receiptBase64 })
      });
      closeModals();
      showToast(res.message);
      showCustomerSubtab("myBookings");
    } catch (err) {
      showToast(err.message);
    }
  }

  async function loadCustomerBookings() {
    if (!currentUser || currentUser.role !== "customer") {
      document.getElementById("customerBookingsTbody").innerHTML =
        '<tr><td colspan="8" style="text-align:center; padding:30px;">Please <a href="#" onclick="App.showAuthModal()">sign in</a> to view your past bookings and tax receipts.</td></tr>';
      return;
    }

    try {
      const bookings = await api("/api/customer/bookings");
      const tbody = document.getElementById("customerBookingsTbody");
      tbody.innerHTML = "";

      if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;">No bookings found. Select a test from the catalogue to begin!</td></tr>';
        return;
      }

      bookings.forEach(b => {
        const isPaid = b.payment_status === "paid";
        const isPending = b.payment_status === "pending";
        const tr = document.createElement("tr");

        const rawAmt = b.final_amount_snapshot ?? b.payable_amount ?? b.total_amount ?? b.amount ?? 0;
        const numAmt = Number(rawAmt) || 0;
        const bRef = b.booking_reference || b.booking_code || ("MLB-" + b.id);
        const compName = b.company_name_snapshot || b.company_name || "Apollo Diagnostics";
        const testName = b.test_name_snapshot || b.test_name || "Diagnostic Panel";
        const sampleType = b.sample_type_snapshot || b.sample_type || "EDTA Whole Blood";
        const apptDate = b.appointment_date || b.scheduled_date || "Today";
        const apptSlot = b.appointment_slot || b.time_slot || "08:00 AM - 10:00 AM";
        const payStatus = (b.payment_status || "unpaid").toLowerCase();
        const collStatus = b.collection_status || b.status || "CONFIRMED";

        tr.innerHTML = `
          <td><b>${bRef}</b></td>
          <td>${compName}</td>
          <td><b>${testName}</b><br/><small style="color:#64748b;">${sampleType}</small></td>
          <td>${apptDate}<br/><small style="color:#64748b;">${apptSlot}</small></td>
          <td><b>₹${numAmt.toFixed(2)}</b></td>
          <td><span class="badge badge-${payStatus}">${payStatus.toUpperCase()}</span></td>
          <td><span class="badge badge-active">${collStatus}</span></td>
          <td>
            ${isPaid
              ? `<a href="/api/bookings/${b.id}/receipt.pdf" target="_blank" class="btn btn-outline" style="padding:6px 10px; font-size:12px;">📄 Download PDF</a>`
              : (isPending
                ? `<span style="font-size:11px; color:var(--warning); font-weight:700;">Awaiting Admin Verification</span>`
                : `<button class="btn btn-primary" style="padding:6px 10px; font-size:12px;" onclick="App.openPaymentModal(${b.id})">Pay UPI</button>`)
            }
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // ---------------- ADMIN DASHBOARD FUNCTIONS ----------------
  function showAdminTab(tabName) {
    const tabs = ["assignments", "payments", "companies", "tests", "staff", "tracking"];
    tabs.forEach(t => {
      const el = document.getElementById(`admin${t.charAt(0).toUpperCase() + t.slice(1)}View`);
      if (el) el.style.display = t === tabName ? "block" : "none";
    });
    document.querySelectorAll("#adminSection .tabs-header .tab-btn").forEach((btn, idx) => {
      btn.classList.toggle("active", tabs[idx] === tabName);
    });

    if (tabName === "assignments") loadAdminAssignments();
    if (tabName === "payments") loadAdminPayments();
    if (tabName === "companies") loadAdminCompanies();
    if (tabName === "tests") loadAdminPricing();
    if (tabName === "staff") loadAdminStaff();
    if (tabName === "tracking") {
      setTimeout(() => { if (map) map.invalidateSize(); }, 300);
      pollActiveTracking();
    }
  }

  async function loadAdminAssignments() {
    try {
      const [assignments, staff] = await Promise.all([
        api("/api/admin/assignments"),
        api("/api/admin/staff")
      ]);

      document.getElementById("adminStatBookings").textContent = assignments.length;
      document.getElementById("adminStatCollectors").textContent = staff.filter(s => s.active).length;

      const tbody = document.getElementById("adminAssignmentsTbody");
      tbody.innerHTML = "";

      assignments.forEach(b => {
        const tr = document.createElement("tr");
        const activeCollectors = staff.filter(s => s.active);
        const options = activeCollectors.map(s =>
          `<option value="${s.id}" ${s.display_name === b.collector_name ? "selected" : ""}>${s.display_name}</option>`
        ).join("");

        tr.innerHTML = `
          <td><b>${b.booking_reference}</b><br/><small style="color:#64748b;">${b.invoice_id}</small></td>
          <td><b>${b.patient_name}</b><br/><small>${b.phone}</small></td>
          <td>${b.company_name_snapshot}<br/><small style="color:#64748b;">${b.test_name_snapshot}</small></td>
          <td>${b.collection_address}<br/><small>${b.appointment_date} (${b.appointment_slot})</small></td>
          <td><span class="badge badge-${b.payment_status}">${b.payment_status.toUpperCase()}</span></td>
          <td><span class="badge badge-active">${b.collection_status}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <select id="collectorSelect_${b.id}" class="form-control" style="font-size:12px; padding:6px;">
                <option value="">Choose Phlebotomist...</option>
                ${options}
              </select>
              <button class="btn btn-outline" style="padding:6px 10px; font-size:12px;" onclick="App.assignCollector(${b.id})">Assign</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function assignCollector(bookingId) {
    const sel = document.getElementById(`collectorSelect_${bookingId}`);
    const collectorId = sel ? sel.value : "";
    if (!collectorId) {
      showToast("Please choose an active phlebotomist.");
      return;
    }
    try {
      const res = await api(`/api/admin/bookings/${bookingId}/assign`, {
        method: "POST",
        body: JSON.stringify({ collector_id: Number(collectorId) })
      });
      showToast(res.message);
      loadAdminAssignments();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function loadAdminPayments() {
    try {
      const bookings = await api("/api/admin/assignments");
      const pending = bookings.filter(b => ["pending", "pending_collection", "unpaid"].includes(b.payment_status));
      document.getElementById("adminStatPendingPay").textContent = pending.filter(b =>
        b.payment_status === "pending" || b.payment_status === "pending_collection").length;

      const tbody = document.getElementById("adminPaymentsTbody");
      tbody.innerHTML = "";

      if (pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;">No pending payments to reconcile. All payments verified ✓</td></tr>';
        return;
      }

      pending.forEach(b => {
        const isCash = b.payment_method_detail === "cash_on_arrival";
        const methodBadge = isCash
          ? `<span style="background:#dcfce7;color:#16a34a;padding:3px 8px;border-radius:20px;font-size:12px;font-weight:600;">💵 Cash</span>`
          : `<span style="background:#dbeafe;color:#1d4ed8;padding:3px 8px;border-radius:20px;font-size:12px;font-weight:600;">📱 UPI Online</span>`;

        const receiptCell = b.payment_receipt_data
          ? `<a href="${b.payment_receipt_data}" target="_blank"><img src="${b.payment_receipt_data}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1.5px solid #e2e8f0;cursor:pointer;" title="View receipt" /></a>`
          : `<span style="color:#94a3b8;font-size:12px;">${isCash ? "N/A (Cash)" : "Not uploaded"}</span>`;

        const utrCell = b.transaction_reference
          ? `<code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:12px;">${b.transaction_reference}</code>`
          : `<span style="color:#94a3b8;font-size:12px;">${isCash ? "N/A (Cash)" : "Not submitted"}</span>`;

        const canVerify = b.payment_status === "pending" || b.payment_status === "pending_collection";

        const rawAmt = b.final_amount_snapshot ?? b.payable_amount ?? b.total_amount ?? b.amount ?? 0;
        const numAmt = Number(rawAmt) || 0;
        const bRef = b.booking_reference || b.booking_code || ("MLB-" + b.id);
        const pName = b.patient_name || "Patient";
        const payStatus = (b.payment_status || "unpaid").toLowerCase();

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><b>${bRef}</b></td>
          <td>${pName}</td>
          <td><b>₹${numAmt.toFixed(2)}</b></td>
          <td>${methodBadge}</td>
          <td>${utrCell}</td>
          <td>${receiptCell}</td>
          <td><span class="badge badge-${payStatus}">${payStatus.replace(/_/g," ").toUpperCase()}</span></td>
          <td>
            ${canVerify
              ? `<div style="display:flex;gap:6px;">
                  <button class="btn btn-success" style="padding:6px 10px;font-size:12px;" onclick="App.verifyPayment(${b.id},'approve')">${isCash ? "✔ Confirm Collected" : "✔ Approve (Paid)"}</button>
                  <button class="btn btn-danger" style="padding:6px 10px;font-size:12px;" onclick="App.verifyPayment(${b.id},'reject')">✗ Reject</button>
                </div>`
              : `<span style="color:#64748b;font-size:12px;">Awaiting submission</span>`
            }
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function verifyPayment(bookingId, action) {
    const defaultNote = action === "approve"
      ? "Verified in laboratory bank account / Cash collected by collector."
      : "Payment could not be verified.";
    const notes = prompt(`Enter notes for ${action === "approve" ? "approving" : "rejecting"} this payment:`, defaultNote);
    if (notes === null) return;

    try {
      const res = await api(`/api/admin/bookings/${bookingId}/verify-payment`, {
        method: "POST",
        body: JSON.stringify({ action, notes })
      });
      showToast(res.message);
      loadAdminPayments();
      loadAdminAssignments();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function loadAdminCompanies() {
    try {
      const companyList = await api("/api/admin/companies");
      const tbody = document.getElementById("adminCompaniesTbody");
      tbody.innerHTML = "";

      companyList.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><b>${c.name}</b> ${c.is_primary_tab ? '<span class="badge badge-active">Primary Tab</span>' : ""}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:18px; height:18px; border-radius:4px; background:${c.brand_color};"></span>
              <code>${c.brand_color}</code>
            </div>
          </td>
          <td>${c.logo_url ? `<img src="${c.logo_url}" style="height:24px; max-width:80px; object-fit:contain;" alt="logo" />` : "Default"}</td>
          <td>${c.contact_phone}<br/><small style="color:#64748b;">${c.contact_email}</small></td>
          <td><code>${c.upi_id}</code></td>
          <td><span class="badge badge-${c.active ? "paid" : "failed"}">${c.active ? "Active" : "Disabled"}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; font-weight:600;" onclick="App.openEditCompanyModal(${c.id})">✏ Edit Details</button>
              <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="App.toggleCompanyActive(${c.id}, ${!c.active})">
                ${c.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  function openEditCompanyModal(companyId) {
    const compList = companies.length ? companies : getStoredCompanies();
    const c = compList.find(item => item.id === parseInt(companyId));
    if (!c) return;
    document.getElementById("editCompanyId").value = c.id;
    document.getElementById("editCompanyName").value = c.name || "";
    document.getElementById("editCompanyColor").value = c.brand_color || c.theme_color || "#1769aa";
    document.getElementById("editCompanyLogoUrl").value = c.logo_url || "";
    document.getElementById("editCompanyUpi").value = c.upi_id || "multilab07@upi";
    document.getElementById("editCompanyPhone").value = c.contact_phone || "";
    document.getElementById("editCompanyEmail").value = c.contact_email || "";
    document.getElementById("editCompanyAddress").value = c.address || "";
    document.getElementById("editCompanyModalTitle").textContent = `Edit Laboratory: ${c.name}`;
    document.getElementById("editCompanyModal").style.display = "flex";
  }

  async function handleUpdateCompany(e) {
    e.preventDefault();
    const companyId = document.getElementById("editCompanyId").value;
    const payload = {
      name: document.getElementById("editCompanyName").value.trim(),
      brand_color: document.getElementById("editCompanyColor").value,
      logo_url: document.getElementById("editCompanyLogoUrl").value.trim(),
      upi_id: document.getElementById("editCompanyUpi").value.trim(),
      contact_phone: document.getElementById("editCompanyPhone").value.trim(),
      contact_email: document.getElementById("editCompanyEmail").value.trim(),
      address: document.getElementById("editCompanyAddress").value.trim()
    };
    try {
      const res = await api(`/api/admin/companies/${companyId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      closeModals();
      showToast(res.message || "Laboratory details updated successfully.");
      await loadCompanies();
      loadAdminCompanies();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function toggleCompanyActive(companyId, newActiveState) {
    try {
      await api(`/api/admin/companies/${companyId}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ active: newActiveState })
      });
      showToast("Company status updated.");
      loadAdminCompanies();
      loadCompanies();
    } catch (err) {
      showToast(err.message);
    }
  }

  function openAddCompanyModal() {
    document.getElementById("addCompanyModal").style.display = "flex";
  }

  async function handleCreateCompany(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById("newCompanyName").value.trim(),
      brand_color: document.getElementById("newCompanyColor").value,
      logo_url: document.getElementById("newCompanyLogoUrl").value.trim(),
      upi_id: document.getElementById("newCompanyUpi").value.trim(),
      contact_phone: document.getElementById("newCompanyPhone").value.trim(),
      contact_email: document.getElementById("newCompanyEmail").value.trim()
    };
    try {
      const res = await api("/api/admin/companies", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      closeModals();
      showToast(`Company ${res.name} created!`);
      loadAdminCompanies();
      loadCompanies();
    } catch (err) {
      showToast(err.message);
    }
  }

  let adminPricingTests = [];

  function openAddTestModal() {
    const sel = document.getElementById("addTestCompanySelect");
    if (sel) {
      sel.innerHTML = "";
      const compList = companies.length ? companies : getStoredCompanies();
      compList.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name;
        sel.appendChild(opt);
      });
      const pricingSelect = document.getElementById("adminPricingCompanySelect");
      if (pricingSelect && pricingSelect.value) {
        sel.value = pricingSelect.value;
      }
    }
    document.getElementById("addTestForm").reset();
    document.getElementById("addTestModal").style.display = "flex";
  }

  async function handleCreateTest(e) {
    e.preventDefault();
    const companyId = parseInt(document.getElementById("addTestCompanySelect").value) || 1;
    const price = parseFloat(document.getElementById("addTestPrice").value);
    const discount = parseFloat(document.getElementById("addTestDiscount").value || 0);
    const payload = {
      company_id: companyId,
      name: document.getElementById("addTestName").value.trim(),
      code: document.getElementById("addTestCode").value.trim() || ("MLB-" + Math.floor(100 + Math.random() * 900)),
      category: document.getElementById("addTestCategory").value,
      price: price,
      discount_percent: discount,
      turnaround_time: document.getElementById("addTestTurnaround").value.trim() || "12 hours",
      sample_type: document.getElementById("addTestSample").value.trim() || "EDTA Whole Blood",
      preparation: document.getElementById("addTestPrep").value.trim(),
      description: document.getElementById("addTestDescription").value.trim(),
      is_available: 1
    };

    try {
      const res = await api("/api/admin/tests", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      closeModals();
      showToast(`Test '${res.name}' created successfully!`);
      loadAdminPricing(companyId);
      loadTestsForCurrentCompany();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function loadAdminPricing(companyId) {
    const sel = document.getElementById("adminPricingCompanySelect");
    const cId = companyId || (sel ? sel.value : 1) || 1;
    try {
      const tests = await api(`/api/tests?company_id=${cId}`);
      adminPricingTests = tests;
      const tbody = document.getElementById("adminPricingTbody");
      tbody.innerHTML = "";

      tests.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><code>${t.code}</code></td>
          <td><b>${t.name}</b></td>
          <td>${t.category}</td>
          <td><b>₹${Number(t.price || 0).toFixed(2)}</b> (Net: ₹${Number(t.final_price || t.price || 0).toFixed(2)})</td>
          <td>${t.discount_percent}%</td>
          <td>${t.sample_type}</td>
          <td><span class="badge badge-${t.is_available ? "paid" : "failed"}">${t.is_available ? "Available" : "Unavailable"}</span></td>
          <td>
            <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; font-weight:600;" onclick="App.openEditPricingModal(${cId}, ${t.id})">✏ Edit Test & Price</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  function openEditPricingModal(companyId, testId) {
    const test = (adminPricingTests || []).find(t => t.id === parseInt(testId)) ||
                 allTests.find(t => t.id === parseInt(testId)) ||
                 getStoredTests().find(t => t.id === parseInt(testId));
    if (!test) return;

    document.getElementById("priceEditCompanyId").value = companyId;
    document.getElementById("priceEditTestId").value = test.id;
    document.getElementById("editPricingTitle").textContent = `Edit Test: ${test.name}`;
    document.getElementById("priceEditName").value = test.name || "";
    document.getElementById("priceEditCode").value = test.code || "";
    document.getElementById("priceEditCategory").value = test.category || "Blood Tests";
    document.getElementById("priceEditPrice").value = test.price || 300.0;
    document.getElementById("priceEditDiscount").value = test.discount_percent || 0.0;
    document.getElementById("priceEditTurnaround").value = test.turnaround_time || "12 hours";
    document.getElementById("priceEditSample").value = test.sample_type || "EDTA Lavender Top Tube (Whole Blood)";
    document.getElementById("priceEditPrep").value = test.preparation || "";
    document.getElementById("priceEditDescription").value = test.description || "";
    document.getElementById("priceEditAvailable").value = test.is_available === 0 ? "0" : "1";
    document.getElementById("editPricingModal").style.display = "flex";
  }

  async function handleSaveTestPricing(e) {
    e.preventDefault();
    const companyId = document.getElementById("priceEditCompanyId").value;
    const testId = document.getElementById("priceEditTestId").value;
    const price = parseFloat(document.getElementById("priceEditPrice").value);
    const discount = parseFloat(document.getElementById("priceEditDiscount").value || 0);

    const payload = {
      test_id: parseInt(testId),
      company_id: parseInt(companyId),
      name: document.getElementById("priceEditName").value.trim(),
      code: document.getElementById("priceEditCode").value.trim(),
      category: document.getElementById("priceEditCategory").value,
      price: price,
      discount_percent: discount,
      turnaround_time: document.getElementById("priceEditTurnaround").value.trim(),
      sample_type: document.getElementById("priceEditSample").value.trim(),
      preparation: document.getElementById("priceEditPrep").value.trim(),
      preparation_instructions: document.getElementById("priceEditPrep").value.trim(),
      description: document.getElementById("priceEditDescription").value.trim(),
      is_available: document.getElementById("priceEditAvailable").value === "1" ? 1 : 0
    };

    try {
      const res = await api(`/api/admin/companies/${companyId}/tests/${testId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      closeModals();
      showToast(res.message || "Test details & pricing updated successfully!");
      loadAdminPricing(companyId);
      loadTestsForCurrentCompany();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function loadAdminStaff() {
    try {
      const [staff, admins] = await Promise.all([
        api("/api/admin/staff"),
        api("/api/admin/admins")
      ]);

      const tbody = document.getElementById("adminStaffTbody");
      tbody.innerHTML = "";

      staff.forEach(s => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><b>${s.display_name}</b></td>
          <td><code>${s.username}</code></td>
          <td>${s.phone || "—"}</td>
          <td>Phlebotomist (Collector)</td>
          <td><span class="badge badge-${s.active ? "paid" : "failed"}">${s.active ? "Active" : "Disabled"}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="App.resetStaffPassword(${s.id}, '${s.username}')">Reset Pass</button>
              <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="App.toggleStaffActive(${s.id}, ${!s.active})">${s.active ? "Deactivate" : "Activate"}</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      admins.forEach(a => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><b>${a.display_name}</b></td>
          <td><code>${a.username}</code></td>
          <td>—</td>
          <td>Admin Member</td>
          <td><span class="badge badge-${a.active ? "paid" : "failed"}">${a.active ? "Active" : "Disabled"}</span></td>
          <td>${a.is_current ? "<i>Current Account</i>" : `<button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="App.toggleAdminActive(${a.id}, ${!a.active})">${a.active ? "Deactivate" : "Activate"}</button>`}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  function openAddCollectorModal() {
    document.getElementById("addCollectorModal").style.display = "flex";
  }

  async function handleCreateCollector(e) {
    e.preventDefault();
    const payload = {
      display_name: document.getElementById("collectorStaffName").value.trim(),
      username: document.getElementById("collectorUsername").value.trim(),
      temporary_password: document.getElementById("collectorTempPass").value,
      phone: document.getElementById("collectorPhone").value.trim()
    };
    try {
      const res = await api("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      closeModals();
      showToast(`Collector account '${res.username}' created.`);
      loadAdminStaff();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function toggleStaffActive(staffId, active) {
    try {
      await api(`/api/admin/staff/${staffId}`, {
        method: "PATCH",
        body: JSON.stringify({ active })
      });
      showToast("Staff status updated.");
      loadAdminStaff();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function resetStaffPassword(staffId, username) {
    const tempPass = prompt(`Enter new temporary password for ${username} (min 8 characters):`, "ChangeMe@2026");
    if (!tempPass) return;
    try {
      const res = await api(`/api/admin/staff/${staffId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ temporary_password: tempPass })
      });
      showToast(res.message);
    } catch (err) {
      showToast(err.message);
    }
  }

  // ---------------- LIVE LEAFLET MAP TRACKING (Admin) ----------------
  function initAdminMap() {
    if (map || !window.L) return;
    const mapEl = document.getElementById("adminMap");
    if (!mapEl) return;
    map = L.map("adminMap").setView([13.0827, 80.2707], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
  }

  async function pollActiveTracking() {
    initAdminMap();
    try {
      const trips = await api("/api/admin/tracking");
      document.getElementById("adminStatTrips").textContent = trips.length;

      const badge = document.getElementById("mapStatusBadge");
      if (trips.length > 0) {
        badge.textContent = `${trips.length} Active Trip(s) Streaming Live`;
        badge.className = "badge badge-paid";
      } else {
        badge.textContent = "No collectors currently in transit";
        badge.className = "badge badge-pending";
      }

      // Sync markers
      const activeIds = new Set(trips.map(t => String(t.booking_id)));
      Object.keys(mapMarkers).forEach(id => {
        if (!activeIds.has(id)) {
          map.removeLayer(mapMarkers[id]);
          delete mapMarkers[id];
        }
      });

      trips.forEach(t => {
        const id = String(t.booking_id);
        const latlng = [t.latitude, t.longitude];
        const popupText = `<b>${t.collector_name}</b><br/>En Route to: ${t.patient_name}<br/>Test: ${t.test_name_snapshot}<br/>Status: <b>${t.collection_status}</b>`;

        if (mapMarkers[id]) {
          mapMarkers[id].setLatLng(latlng).setPopupContent(popupText);
        } else {
          mapMarkers[id] = L.marker(latlng).addTo(map).bindPopup(popupText);
        }
      });

      if (trips.length > 0) {
        const group = L.featureGroup(Object.values(mapMarkers));
        map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 15 });
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ---------------- COLLECTOR BOY PORTAL & GPS TRACKING ----------------
  async function loadCollectorAssignments() {
    try {
      const tasks = await api("/api/collector/assignments");
      const container = document.getElementById("collectorTasksContainer");
      container.innerHTML = "";

      if (tasks.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">No active home collection appointments assigned to you.</div>';
        return;
      }

      tasks.forEach(t => {
        const card = document.createElement("div");
        card.className = "panel";
        card.style.marginBottom = "14px";

        const nextActionMap = {
          "Assigned": "Accepted",
          "Accepted": "On the Way",
          "On the Way": "Arrived",
          "Arrived": "Sample Collected"
        };
        const nextStatus = nextActionMap[t.collection_status];

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:10px;">
            <div>
              <span class="badge badge-active">${t.collection_status}</span>
              <h3 style="margin:8px 0 4px; font-size:17px;">#${t.booking_reference} — ${t.patient_name}</h3>
              <div style="font-size:13px; color:#475569; margin-bottom:6px;">
                📞 <a href="tel:${t.phone}" style="color:var(--primary); font-weight:700;">${t.phone}</a> &nbsp;|&nbsp; 📍 ${t.collection_address}
              </div>
              <div style="font-size:13px; color:#64748b;">
                🧪 <b>Test:</b> ${t.test_name_snapshot} (${t.sample_type_snapshot}) &nbsp;|&nbsp; ⏰ ${t.appointment_date} (${t.appointment_slot})
              </div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              ${nextStatus
                ? `<button class="btn btn-primary" onclick="App.updateCollectorStatus(${t.booking_id}, '${nextStatus}')">Mark ${nextStatus}</button>`
                : `<span class="badge badge-paid">Collection Complete</span>`
              }
              <button class="btn btn-danger" onclick="App.updateCollectorStatus(${t.booking_id}, 'Cancelled')">Cancel</button>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function updateCollectorStatus(bookingId, status) {
    try {
      const res = await api(`/api/collector/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      showToast(res.message);

      // Handle GPS tracking policy
      if (status === "On the Way" || status === "Arrived") {
        startCollectorGps(bookingId);
      } else {
        stopCollectorGps();
      }

      loadCollectorAssignments();
    } catch (err) {
      showToast(err.message);
    }
  }

  function startCollectorGps(bookingId) {
    if (!navigator.geolocation) {
      showToast("Browser does not support geolocation.");
      return;
    }
    collectorActiveBookingId = bookingId;
    document.getElementById("collectorGpsBanner").style.display = "block";

    if (collectorGeoWatch === null) {
      collectorGeoWatch = navigator.geolocation.watchPosition(
        async pos => {
          if (!collectorActiveBookingId) return;
          try {
            await api(`/api/collector/bookings/${collectorActiveBookingId}/location`, {
              method: "POST",
              body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
            });
          } catch (e) {
            console.warn("Location update failed:", e.message);
          }
        },
        err => { console.warn("GPS error:", err.message); },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }
  }

  function stopCollectorGps() {
    if (collectorGeoWatch !== null) {
      navigator.geolocation.clearWatch(collectorGeoWatch);
      collectorGeoWatch = null;
    }
    collectorActiveBookingId = null;
    const banner = document.getElementById("collectorGpsBanner");
    if (banner) banner.style.display = "none";
  }

  // ---------------- ROLE-SPECIFIC HELP MODAL ----------------
  async function openHelpModal() {
    const role = currentUser ? currentUser.role : "customer";
    try {
      const data = await api(`/api/help/${role}`);
      document.getElementById("helpModalTitle").textContent = data.title;
      const body = document.getElementById("helpModalBody");
      body.innerHTML = data.sections.map(s => `
        <div style="margin-bottom:14px;">
          <h4 style="font-size:14.5px; font-weight:800; color:var(--text-main); margin-bottom:4px;">${s.heading}</h4>
          <p style="color:#475569; margin:0;">${s.content}</p>
        </div>
      `).join("");
      document.getElementById("helpModal").style.display = "flex";
    } catch (err) {
      showToast(err.message);
    }
  }

  function closeModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => {
      m.style.display = "none";
    });
  }

  let deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  function showInstallAppModal() {
    document.getElementById("installAppModal").style.display = "flex";
  }

  async function triggerPwaInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        showToast("MultiLab07 installed successfully!");
        closeModals();
      }
      deferredInstallPrompt = null;
    } else {
      showToast("To install on mobile: tap your browser menu (⋮) and select 'Install app' or 'Add to Home Screen'.");
    }
  }

  function togglePassword(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.type = el.type === "password" ? "text" : "password";
  }

  // Expose public methods
  return {
    init,
    quickLogin,
    navigateHome,
    showAuthModal,
    showInstallAppModal,
    triggerPwaInstall,
    setLoginRole,
    handleCustomerLogin,
    handleCustomerPhoneLogin,
    handleCollectorLogin,
    handleAdminLogin,
    handleStaffLogin,
    handleLogin,
    logout,
    toggleSelectTest,
    updateMultiTestUI,
    clearSelectedTests,
    openMultiBookingModal,
    removeTestFromBooking,
    scrollToContact,
    scrollToTests,
    showRegisterModal,
    showForgotPasswordModal,
    sendRegistrationOtp,
    verifyRegistrationOtp,
    handleCustomerRegister,
    switchCompanyTab,
    handleDropdownCompanyChange,
    filterCategory,
    handleTestSearch,
    showCustomerSubtab,
    openBookingModal,
    handleCreateBooking,
    openPaymentModal,
    selectPaymentMethod,
    submitCashOnArrival,
    handleSubmitPayment,
    loadCustomerBookings,
    showAdminTab,
    loadAdminAssignments,
    assignCollector,
    loadAdminPayments,
    verifyPayment,
    loadAdminCompanies,
    toggleCompanyActive,
    openAddCompanyModal,
    handleCreateCompany,
    openEditCompanyModal,
    handleUpdateCompany,
    loadAdminPricing,
    openAddTestModal,
    handleCreateTest,
    openEditPricingModal,
    handleSaveTestPricing,
    loadAdminStaff,
    openAddCollectorModal,
    handleCreateCollector,
    toggleStaffActive,
    resetStaffPassword,
    loadCollectorAssignments,
    updateCollectorStatus,
    openHelpModal,
    closeModals,
    togglePassword,
    api,
    getStoredStaff,
    getStoredCompanies,
    getStoredTests
  };
})();

window.App = App;
window.addEventListener("DOMContentLoaded", App.init);
