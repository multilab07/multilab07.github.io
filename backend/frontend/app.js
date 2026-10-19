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

  // ---------------- API HELPER ----------------
  async function api(endpoint, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(endpoint, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "An unexpected error occurred.");
    }
    return data;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 4000);
  }

  // ---------------- INITIALIZATION ----------------
  async function init() {
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
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, role: loginRole })
      });

      token = res.access_token;
      currentUser = {
        role: res.role,
        username: res.username,
        display_name: res.display_name
      };
      localStorage.setItem("bloodlab_token", token);
      localStorage.setItem("bloodlab_user", JSON.stringify(currentUser));

      showToast(`Welcome back, ${currentUser.display_name}!`);
      updateAuthUI();
      switchRoleView(res.role);
    } catch (err) {
      showToast(err.message);
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
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery) ||
        t.code.toLowerCase().includes(searchQuery) ||
        t.description.toLowerCase().includes(searchQuery);
      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">No diagnostic tests found matching your criteria.</div>';
      return;
    }

    filtered.forEach(t => {
      const card = document.createElement("div");
      card.className = "test-card";

      const hasDiscount = t.discount_percent > 0;
      card.innerHTML = `
        ${hasDiscount ? `<span class="test-badge">${t.discount_percent}% OFF</span>` : ""}
        <div>
          <h3 class="test-title">${t.name}</h3>
          <p class="test-desc">${t.description || "Comprehensive clinical pathology evaluation."}</p>
          <div class="test-meta">
            <div class="test-meta-row"><span>🧪 <b>Sample:</b> ${t.sample_type}</span></div>
            <div class="test-meta-row"><span>⏱ <b>Turnaround:</b> ${t.turnaround_time}</span></div>
            <div class="test-meta-row"><span>📋 <b>Prep:</b> ${t.preparation}</span></div>
          </div>
        </div>
        <div class="test-footer">
          <div class="price-box">
            <span class="final-price">₹${t.final_price.toFixed(2)}</span>
            ${hasDiscount ? `<span class="original-price">₹${t.price.toFixed(2)}</span>` : ""}
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
            <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="App.toggleCompanyActive(${c.id}, ${!c.active})">
              ${c.active ? "Deactivate" : "Activate"}
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
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

  async function loadAdminPricing(companyId) {
    const sel = document.getElementById("adminPricingCompanySelect");
    const cId = companyId || (sel ? sel.value : 1) || 1;
    try {
      const tests = await api(`/api/tests?company_id=${cId}`);
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
            <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" onclick="App.openEditPricingModal(${cId}, ${t.id})">Configure</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  function openEditPricingModal(companyId, testId) {
    const test = allTests.find(t => t.id === testId);
    document.getElementById("priceEditCompanyId").value = companyId;
    document.getElementById("priceEditTestId").value = testId;
    document.getElementById("editPricingTitle").textContent = `Configure Pricing: ${test ? test.name : "Test"}`;
    document.getElementById("priceEditPrice").value = test ? test.price : 300.0;
    document.getElementById("priceEditDiscount").value = test ? test.discount_percent : 0.0;
    document.getElementById("priceEditSample").value = test ? test.sample_type : "Blood";
    document.getElementById("priceEditPrep").value = test ? test.preparation : "";
    document.getElementById("editPricingModal").style.display = "flex";
  }

  async function handleSaveTestPricing(e) {
    e.preventDefault();
    const companyId = document.getElementById("priceEditCompanyId").value;
    const testId = document.getElementById("priceEditTestId").value;
    const payload = {
      price: parseFloat(document.getElementById("priceEditPrice").value),
      discount_percent: parseFloat(document.getElementById("priceEditDiscount").value),
      sample_type: document.getElementById("priceEditSample").value.trim(),
      preparation_instructions: document.getElementById("priceEditPrep").value.trim(),
      is_available: document.getElementById("priceEditAvailable").value === "1"
    };

    try {
      const res = await api(`/api/admin/companies/${companyId}/tests/${testId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      closeModals();
      showToast(res.message);
      loadAdminPricing(companyId);
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
    loadAdminPricing,
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
    togglePassword
  };
})();

window.addEventListener("DOMContentLoaded", App.init);
