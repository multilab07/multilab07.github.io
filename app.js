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
    { id: 1, name: "MultiLab07 Flagship Hub", brand_color: "#0284c7", theme_color: "#0284c7", upi_id: "multilab07@upi", contact_phone: "+91 98401 23456", contact_email: "care@multilab07.com", address: "Central Diagnostics Tower, Bangalore", is_primary_tab: true, active: true },
    { id: 2, name: "Apollo Diagnostics", brand_color: "#16a34a", theme_color: "#16a34a", upi_id: "apollo@upi", contact_phone: "+91 1800 102 0288", contact_email: "support@apollodiagnostics.in", address: "NABL Accredited Reference Hub, Chennai", is_primary_tab: true, active: true },
    { id: 3, name: "Dr. Lal PathLabs", brand_color: "#f59e0b", theme_color: "#f59e0b", upi_id: "lalpath@upi", contact_phone: "+91 1800 111 744", contact_email: "care@lalpathlabs.com", address: "National Reference Lab, Gurgaon", is_primary_tab: true, active: true },
    { id: 4, name: "Thyrocare Technologies", brand_color: "#8b5cf6", theme_color: "#8b5cf6", upi_id: "thyrocare@upi", contact_phone: "+91 98700 66666", contact_email: "info@thyrocare.com", address: "MIDC Turbhe, Navi Mumbai", is_primary_tab: false, active: true }
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
    try {
      const data = localStorage.getItem(MOCK_STORAGE_STAFF);
      if (data) return JSON.parse(data);
    } catch (e) {}
    const defaultStaff = [
      { id: 1, username: "admin", display_name: "MultiLab Director", role: "admin", password: "Admin123!", phone: "+91 98401 23456", active: true },
      { id: 2, username: "collectorboy", display_name: "Rahul Phlebotomist", role: "collector", password: "CollectorPass123!", phone: "+91 98401 99999", active: true }
    ];
    localStorage.setItem(MOCK_STORAGE_STAFF, JSON.stringify(defaultStaff));
    return defaultStaff;
  }

  function saveStoredStaff(list) {
    try {
      localStorage.setItem(MOCK_STORAGE_STAFF, JSON.stringify(list));
    } catch (e) {}
  }

  function getStoredCompanies() {
    try {
      const data = localStorage.getItem(MOCK_STORAGE_COMPANIES);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(MOCK_STORAGE_COMPANIES, JSON.stringify(MOCK_COMPANIES));
    return MOCK_COMPANIES;
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

  function getStoredBookings() {
    try {
      const data = localStorage.getItem(MOCK_STORAGE_BOOKINGS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    const defaults = [
      {
        id: 101,
        booking_code: "MLB-2026-8812",
        test_name: "Complete Blood Count (CBC) with ESR",
        company_name: "MultiLab07 Flagship Hub",
        patient_name: "Balu Sakthikumaran",
        patient_phone: "9876543210",
        collector_name: "Rahul Phlebotomist",
        collector_id: 2,
        scheduled_date: new Date().toISOString().split("T")[0],
        time_slot: "08:00 AM - 10:00 AM",
        address: "7th Cross, Anna Nagar, Chennai",
        status: "CONFIRMED",
        payment_status: "PAID",
        payment_method: "UPI",
        total_amount: 299,
        created_at: new Date().toISOString()
      },
      {
        id: 102,
        booking_code: "MLB-2026-9045",
        test_name: "MultiLab07 Executive Platinum Health Check (84 Tests)",
        company_name: "MultiLab07 Flagship Hub",
        patient_name: "Priya Sharma",
        patient_phone: "98401 55555",
        collector_name: "Rahul Phlebotomist",
        collector_id: 2,
        scheduled_date: new Date().toISOString().split("T")[0],
        time_slot: "07:00 AM - 09:00 AM",
        address: "Flat 4B, Emerald Residency, T. Nagar, Chennai",
        status: "CONFIRMED",
        payment_status: "PENDING_VERIFICATION",
        payment_method: "UPI",
        total_amount: 1499,
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem(MOCK_STORAGE_BOOKINGS, JSON.stringify(defaults));
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
        if (matched.password === password) {
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
      const newB = {
        id: Date.now(),
        booking_code: code,
        test_name: body.test_name || "Diagnostic Panel",
        company_name: body.company_name || "MultiLab07 Flagship Hub",
        patient_name: body.patient_name || (currentUser ? currentUser.display_name : "Valued Customer"),
        patient_phone: body.patient_phone || "9876543210",
        scheduled_date: body.scheduled_date || new Date().toISOString().split("T")[0],
        time_slot: body.time_slot || "Morning 07:00 AM - 09:00 AM",
        address: body.address || "Patient Residence Address",
        status: "CONFIRMED",
        payment_status: "PENDING_VERIFICATION",
        payment_method: body.payment_method || "UPI",
        total_amount: body.total_amount || 499,
        created_at: new Date().toISOString()
      };
      bookings.unshift(newB);
      saveStoredBookings(bookings);
      return { booking: newB, tracking_id: code, message: "Booking confirmed successfully!" };
    }

    if (endpoint.startsWith("/api/customer/bookings")) {
      return getStoredBookings();
    }

    if (endpoint.startsWith("/api/admin/bookings") || endpoint.startsWith("/api/admin/assignments")) {
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
          saveStoredBookings(bookings);
          return { success: true, message: `Successfully assigned to ${col.display_name}` };
        }
      }
      return getStoredBookings();
    }

    if (endpoint.startsWith("/api/admin/payments")) {
      if (method === "POST" && endpoint.includes("/verify")) {
        const bId = parseInt(endpoint.split("/")[4]);
        const bookings = getStoredBookings();
        const targetB = bookings.find((b) => b.id === bId);
        if (targetB) {
          targetB.payment_status = "PAID";
          saveStoredBookings(bookings);
          return { success: true, message: "Payment verified successfully." };
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
      document.getElementById("loginPassword").value = "Admin123!";
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
    const tabs = document.querySelectorAll("#authSection .tab-btn");
    tabs.forEach((btn, idx) => {
      btn.classList.toggle("active", ["customer", "collector", "admin"][idx] === role);
    });

    const submitBtn = document.getElementById("loginSubmitBtn");
    const signupPrompt = document.getElementById("customerSignupPrompt");
    const userLabel = document.getElementById("loginUserLabel");
    const forgotPrompt = document.getElementById("forgotPasswordPrompt");

    if (role === "customer") {
      submitBtn.textContent = "Sign in as Customer";
      signupPrompt.style.display = "block";
      if (forgotPrompt) forgotPrompt.style.display = "block";
      userLabel.textContent = "Username, Email, or 10-Digit Mobile";
    } else if (role === "collector") {
      submitBtn.textContent = "Sign in as Collector Boy";
      signupPrompt.style.display = "none";
      if (forgotPrompt) forgotPrompt.style.display = "none";
      userLabel.textContent = "Assigned Collector Username";
    } else {
      submitBtn.textContent = "Sign in as Admin";
      signupPrompt.style.display = "none";
      if (forgotPrompt) forgotPrompt.style.display = "none";
      userLabel.textContent = "Admin Username";
    }
  }

  async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!username || !password) {
      showToast("Please enter both username and password.");
      return;
    }

    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, role: loginRole })
      });

      token = res.access_token || res.token || ("mlb_token_" + Date.now());
      const userRole = res.role || loginRole;
      const userName = res.username || username;
      const displayName = res.display_name || userName;

      currentUser = {
        role: userRole,
        username: userName,
        display_name: displayName
      };
      localStorage.setItem("bloodlab_token", token);
      localStorage.setItem("bloodlab_user", JSON.stringify(currentUser));

      showToast(`Welcome back, ${displayName}!`);
      updateAuthUI();
      switchRoleView(userRole);
    } catch (err) {
      showToast(err.message || "Invalid credentials. Please verify your login details.");
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
    document.getElementById("authSection").style.display = "none";
    document.getElementById("customerSection").style.display = "none";
    document.getElementById("adminSection").style.display = "none";
    document.getElementById("collectorSection").style.display = "none";
    document.getElementById("customerBottomNav").style.display = "none";

    if (role === "admin") {
      document.getElementById("adminSection").style.display = "block";
      loadAdminAssignments();
      loadAdminPayments();
      loadAdminCompanies();
      initAdminMap();
    } else if (role === "collector") {
      document.getElementById("collectorSection").style.display = "block";
      loadCollectorAssignments();
    } else {
      // Customer
      document.getElementById("customerSection").style.display = "block";
      document.getElementById("customerBottomNav").style.display = "flex";
      loadTestsForCurrentCompany();
    }
  }

  function showAuthModal() {
    document.getElementById("customerSection").style.display = "none";
    document.getElementById("adminSection").style.display = "none";
    document.getElementById("collectorSection").style.display = "none";
    document.getElementById("customerBottomNav").style.display = "none";
    document.getElementById("authSection").style.display = "block";
    setLoginRole("customer");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateHome() {
    if (currentUser) {
      switchRoleView(currentUser.role);
    } else {
      switchRoleView("customer");
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
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted); font-size:15px; font-weight:600;">No diagnostic tests found matching your criteria.</div>';
      return;
    }

    filtered.forEach(t => {
      const card = document.createElement("div");
      card.className = "test-card";

      const discountPercent = Number(t.discount_percent || 0);
      const hasDiscount = discountPercent > 0;
      const finalPrice = Number(t.final_price !== undefined ? t.final_price : (t.price || 0));
      const originalPrice = Number(t.price || (finalPrice * 1.5));

      card.innerHTML = `
        ${hasDiscount ? `<span class="test-badge">${discountPercent}% OFF</span>` : ""}
        <div>
          <h3 class="test-title">${t.name}</h3>
          <p class="test-desc">${t.description || "Comprehensive clinical pathology evaluation by NABL accredited lab."}</p>
          <div class="test-meta">
            <div class="test-meta-row"><span>🧪 <b>Sample:</b> ${t.sample_type || "Whole Blood"}</span></div>
            <div class="test-meta-row"><span>⏱ <b>Turnaround:</b> ${t.turnaround_time || "6-12 hours"}</span></div>
            <div class="test-meta-row"><span>📋 <b>Prep:</b> ${t.preparation || "No special preparation needed"}</span></div>
          </div>
        </div>
        <div class="test-footer">
          <div class="price-box">
            <span class="final-price">₹${finalPrice.toFixed(2)}</span>
            ${hasDiscount ? `<span class="original-price">₹${originalPrice.toFixed(2)}</span>` : ""}
          </div>
          <button class="btn btn-primary" onclick="App.openBookingModal(${t.id})">Book Home Collection</button>
        </div>
      `;
      grid.appendChild(card);
    });
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
    const test = allTests.find(t => t.id === testId);
    if (!test) return;
    const company = companies.find(c => c.id === currentCompanyId);

    document.getElementById("bookTestId").value = test.id;
    document.getElementById("bookCompanyId").value = currentCompanyId;
    document.getElementById("bookTestName").textContent = test.name;
    document.getElementById("bookCompanyLabel").textContent = `Laboratory: ${company ? company.name : "BloodLab"}`;
    document.getElementById("bookPrice").textContent = `Total: ₹${test.final_price.toFixed(2)}`;

    // Prefill patient if logged in
    if (currentUser) {
      document.getElementById("bookPatientName").value = currentUser.display_name || "";
      document.getElementById("bookPhone").value = currentUser.mobile || "";
    }

    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById("bookDate").value = tomorrow.toISOString().split("T")[0];
    document.getElementById("bookDate").min = tomorrow.toISOString().split("T")[0];

    document.getElementById("bookingModal").style.display = "flex";
  }

  async function handleCreateBooking(e) {
    e.preventDefault();
    const payload = {
      company_id: Number(document.getElementById("bookCompanyId").value),
      test_id: Number(document.getElementById("bookTestId").value),
      patient_name: document.getElementById("bookPatientName").value.trim(),
      phone: document.getElementById("bookPhone").value.trim(),
      collection_address: document.getElementById("bookAddress").value.trim(),
      appointment_date: document.getElementById("bookDate").value,
      appointment_slot: document.getElementById("bookSlot").value
    };

    try {
      const res = await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      closeModals();
      showToast(`Booking ${res.booking_reference} confirmed!`);

      // Immediately open UPI Payment Modal
      openPaymentModal(res.booking_id);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function openPaymentModal(bookingId) {
    try {
      const details = await api(`/api/bookings/${bookingId}/payment-details`);

      if (details.payment_status === "paid") { showToast("This booking has already been paid."); return; }
      if (details.payment_status === "pending") { showToast("Payment already submitted — awaiting Admin verification."); return; }
      if (details.payment_status === "pending_collection") { showToast("Cash on Arrival already confirmed — collector will collect payment at your doorstep."); return; }

      document.getElementById("paymentBookingId").value = details.booking_id;
      document.getElementById("paymentAmountDisplay").textContent = `₹${details.payable_amount.toFixed(2)}`;
      document.getElementById("paymentBookingRefDisplay").textContent = `Booking Ref: ${details.booking_reference}`;
      document.getElementById("cashAmountLabel").textContent = `₹${details.payable_amount.toFixed(2)}`;
      document.getElementById("paymentQrImage").src = details.qr_code_image;
      document.getElementById("paymentUpiIdDisplay").textContent = details.upi_id;
      document.getElementById("upiAmountInline").textContent = `₹${details.payable_amount.toFixed(2)}`;
      document.getElementById("paymentUtrInput").value = "";
      document.getElementById("paymentReceiptFile").value = "";
      document.getElementById("receiptPreviewWrap").style.display = "none";
      document.getElementById("receiptPreviewImg").src = "";
      document.getElementById("cashSection").style.display = "none";
      document.getElementById("upiSection").style.display = "none";
      document.getElementById("paymentMethodCards").style.display = "flex";
      document.getElementById("btnMethodCash").style.cssText = "flex:1;padding:18px 10px;border:2px solid #e2e8f0;border-radius:12px;background:#fff;cursor:pointer;text-align:center;transition:all .2s;";
      document.getElementById("btnMethodOnline").style.cssText = "flex:1;padding:18px 10px;border:2px solid #e2e8f0;border-radius:12px;background:#fff;cursor:pointer;text-align:center;transition:all .2s;";

      document.getElementById("paymentReceiptFile").onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          document.getElementById("receiptPreviewImg").src = ev.target.result;
          document.getElementById("receiptPreviewWrap").style.display = "block";
        };
        reader.readAsDataURL(file);
      };

      document.getElementById("paymentModal").style.display = "flex";
    } catch (err) {
      showToast(err.message);
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

        tr.innerHTML = `
          <td><b>${b.booking_reference}</b></td>
          <td>${b.company_name_snapshot}</td>
          <td><b>${b.test_name_snapshot}</b><br/><small style="color:#64748b;">${b.sample_type_snapshot}</small></td>
          <td>${b.appointment_date}<br/><small style="color:#64748b;">${b.appointment_slot}</small></td>
          <td><b>₹${b.final_amount_snapshot.toFixed(2)}</b></td>
          <td><span class="badge badge-${b.payment_status}">${b.payment_status.toUpperCase()}</span></td>
          <td><span class="badge badge-active">${b.collection_status}</span></td>
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

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><b>${b.booking_reference}</b></td>
          <td>${b.patient_name}</td>
          <td><b>₹${b.final_amount_snapshot.toFixed(2)}</b></td>
          <td>${methodBadge}</td>
          <td>${utrCell}</td>
          <td>${receiptCell}</td>
          <td><span class="badge badge-${b.payment_status}">${b.payment_status.replace(/_/g," ").toUpperCase()}</span></td>
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
          <td><b>₹${t.price.toFixed(2)}</b> (Net: ₹${t.final_price.toFixed(2)})</td>
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
    setLoginRole,
    handleLogin,
    logout,
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
