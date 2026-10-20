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

    // Auto-sync verified contact details for Apollo and PathCare into storage
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
          return {
    init,
    quickLogin,
    navigateHome,
    showAuthModal,
    showInstallAppModal,
    triggerPwaInstall,
    setLoginRole,
    sendCustomerLoginOtp,
    onCustPhoneChange,
    handleCustomerPhoneLogin,
    handleStaffLogin,
    handleLogin,
    logout,
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
