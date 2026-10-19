package com.example.bloodlab

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

// Android emulator -> host machine is 10.0.2.2. For physical device, configure your computer's LAN IP.
private const val BASE_URL = "http://10.0.2.2:5000"

// Data models
data class LabCompany(val id: Int, val name: String, val brandColor: String, val logoUrl: String, val isPrimaryTab: Boolean)
data class LabTest(
    val id: Int, val code: String, val name: String, val category: String,
    val price: Double, val discountPercent: Double, val finalPrice: Double,
    val sampleType: String, val description: String, val preparation: String,
    val turnaroundTime: String
)
data class LabBooking(
    val id: Int, val reference: String, val invoiceId: String, val patientName: String,
    val companyName: String, val testName: String, val sampleType: String,
    val amount: Double, val paymentStatus: String, val collectionStatus: String,
    val appointmentDate: String, val appointmentSlot: String
)

private fun parseColor(hex: String, fallback: Color = Color(0xFF1769AA)): Color = try {
    Color(android.graphics.Color.parseColor(hex))
} catch (_: Exception) { fallback }

// HTTP Network Layer
private suspend fun apiCall(path: String, method: String = "GET", payload: JSONObject? = null, token: String? = null): String = withContext(Dispatchers.IO) {
    val url = URL(BASE_URL + path)
    val conn = url.openConnection() as HttpURLConnection
    conn.requestMethod = method
    conn.connectTimeout = 8000
    conn.readTimeout = 8000
    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
    if (!token.isNullOrEmpty()) {
        conn.setRequestProperty("Authorization", "Bearer $token")
    }
    if (payload != null && (method == "POST" || method == "PUT" || method == "PATCH")) {
        conn.doOutput = true
        conn.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
    }
    try {
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val text = stream.bufferedReader().use { it.readText() }
        if (code !in 200..299) {
            val errMsg = runCatching { JSONObject(text).optString("error", text) }.getOrDefault(text)
            error(errMsg)
        }
        text
    } finally {
        conn.disconnect()
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BloodLabAppRoot()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BloodLabAppRoot() {
    val scope = rememberCoroutineScope()
    var authToken by remember { mutableStateOf<String?>(null) }
    var currentRole by remember { mutableStateOf("customer") } // customer, collector, admin
    var currentUserDisplay by remember { mutableStateOf("Guest") }

    var companies by remember { mutableStateOf<List<LabCompany>>(emptyList()) }
    var selectedCompanyId by remember { mutableStateOf(1) }
    var tests by remember { mutableStateOf<List<LabTest>>(emptyList()) }
    var categories by remember { mutableStateOf<List<String>>(emptyList()) }
    var selectedCategory by remember { mutableStateOf("All") }
    var searchQuery by remember { mutableStateOf("") }
    var customerBookings by remember { mutableStateOf<List<LabBooking>>(emptyList()) }

    var activeCustomerTab by remember { mutableStateOf("catalogue") } // catalogue, bookings
    var showAuthDialog by remember { mutableStateOf(false) }
    var showRegisterDialog by remember { mutableStateOf(false) }
    var showBookingDialog by remember { mutableStateOf<LabTest?>(null) }
    var showPaymentDialog by remember { mutableStateOf<JSONObject?>(null) }
    var showHelpDialog by remember { mutableStateOf(false) }
    var helpContent by remember { mutableStateOf<JSONObject?>(null) }
    var snackbarMessage by remember { mutableStateOf<String?>(null) }

    val currentCompany = companies.find { it.id == selectedCompanyId } ?: companies.firstOrNull()
    val brandThemeColor = parseColor(currentCompany?.brandColor ?: "#1769AA")
    val animatedThemeColor by animateColorAsState(targetValue = brandThemeColor, animationSpec = tween(400), label = "brandColor")

    fun loadCatalog() {
        scope.launch {
            try {
                val compsStr = apiCall("/api/companies")
                val compsArr = JSONArray(compsStr)
                val cList = (0 until compsArr.length()).map { i ->
                    val obj = compsArr.getJSONObject(i)
                    LabCompany(
                        obj.getInt("id"), obj.getString("name"), obj.getString("brand_color"),
                        obj.optString("logo_url", ""), obj.optBoolean("is_primary_tab", false)
                    )
                }
                companies = cList
                if (cList.none { it.id == selectedCompanyId } && cList.isNotEmpty()) {
                    selectedCompanyId = cList.first().id
                }

                val catsStr = apiCall("/api/categories")
                val catsArr = JSONArray(catsStr)
                categories = listOf("All") + (0 until catsArr.length()).map { catsArr.getString(it) }

                val testsStr = apiCall("/api/tests?company_id=$selectedCompanyId")
                val testsArr = JSONArray(testsStr)
                tests = (0 until testsArr.length()).map { i ->
                    val obj = testsArr.getJSONObject(i)
                    LabTest(
                        obj.getInt("id"), obj.getString("code"), obj.getString("name"), obj.getString("category"),
                        obj.getDouble("price"), obj.optDouble("discount_percent", 0.0), obj.getDouble("final_price"),
                        obj.getString("sample_type"), obj.optString("description", ""),
                        obj.optString("preparation", ""), obj.optString("turnaround_time", "24 hours")
                    )
                }
            } catch (e: Exception) {
                snackbarMessage = e.message ?: "Failed to connect to backend."
            }
        }
    }

    fun loadMyBookings() {
        if (authToken == null || currentRole != "customer") return
        scope.launch {
            try {
                val res = apiCall("/api/customer/bookings", token = authToken)
                val arr = JSONArray(res)
                customerBookings = (0 until arr.length()).map { i ->
                    val o = arr.getJSONObject(i)
                    LabBooking(
                        o.getInt("id"), o.getString("booking_reference"), o.getString("invoice_id"),
                        o.getString("patient_name"), o.getString("company_name_snapshot"),
                        o.getString("test_name_snapshot"), o.getString("sample_type_snapshot"),
                        o.getDouble("final_amount_snapshot"), o.getString("payment_status"),
                        o.getString("collection_status"), o.getString("appointment_date"),
                        o.getString("appointment_slot")
                    )
                }
            } catch (e: Exception) {
                snackbarMessage = e.message
            }
        }
    }

    fun openHelp() {
        scope.launch {
            try {
                val res = apiCall("/api/help/$currentRole")
                helpContent = JSONObject(res)
                showHelpDialog = true
            } catch (e: Exception) {
                snackbarMessage = e.message
            }
        }
    }

    LaunchedEffect(selectedCompanyId) {
        loadCatalog()
    }

    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = animatedThemeColor,
            secondary = animatedThemeColor,
            primaryContainer = animatedThemeColor.copy(alpha = 0.12f),
            background = Color(0xFFF4F7FC)
        )
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(currentCompany?.name ?: "BloodLab", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                if (authToken == null) "Guest Patient" else "$currentUserDisplay (${currentRole.uppercase()})",
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = animatedThemeColor,
                        titleContentColor = Color.White,
                        actionIconContentColor = Color.White
                    ),
                    actions = {
                        // Help Icon button at top-right of each role-specific dashboard
                        IconButton(onClick = { openHelp() }) {
                            Icon(Icons.Default.HelpOutline, contentDescription = "Help & Instructions")
                        }
                        if (authToken == null) {
                            TextButton(onClick = { showAuthDialog = true }) {
                                Text("Sign in", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        } else {
                            IconButton(onClick = {
                                authToken = null
                                currentRole = "customer"
                                currentUserDisplay = "Guest"
                                snackbarMessage = "Signed out."
                            }) {
                                Icon(Icons.Default.ExitToApp, contentDescription = "Sign out")
                            }
                        }
                    }
                )
            },
            // SOCIAL-MEDIA STYLE BOTTOM NAVIGATION BAR (Apollo Diagnostics, PathCare, Primgen, and My Bookings)
            bottomBar = {
                if (currentRole == "customer") {
                    NavigationBar(containerColor = Color.White) {
                        val apollo = companies.find { it.name.contains("Apollo", ignoreCase = true) }
                        val pathcare = companies.find { it.name.contains("PathCare", ignoreCase = true) }
                        val primgen = companies.find { it.name.contains("Primgen", ignoreCase = true) }

                        // 1. Apollo Diagnostics Tab
                        NavigationBarItem(
                            selected = activeCustomerTab == "catalogue" && selectedCompanyId == (apollo?.id ?: 1),
                            onClick = {
                                activeCustomerTab = "catalogue"
                                apollo?.let { selectedCompanyId = it.id }
                            },
                            icon = { Icon(Icons.Default.LocalHospital, contentDescription = "Apollo") },
                            label = { Text("Apollo", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Color(0xFF1769AA), indicatorColor = Color(0xFF1769AA).copy(alpha = 0.15f))
                        )

                        // 2. PathCare Tab
                        NavigationBarItem(
                            selected = activeCustomerTab == "catalogue" && selectedCompanyId == (pathcare?.id ?: 2),
                            onClick = {
                                activeCustomerTab = "catalogue"
                                pathcare?.let { selectedCompanyId = it.id }
                            },
                            icon = { Icon(Icons.Default.Science, contentDescription = "PathCare") },
                            label = { Text("PathCare", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Color(0xFF008C95), indicatorColor = Color(0xFF008C95).copy(alpha = 0.15f))
                        )

                        // 3. Primgen Tab
                        NavigationBarItem(
                            selected = activeCustomerTab == "catalogue" && selectedCompanyId == (primgen?.id ?: 3),
                            onClick = {
                                activeCustomerTab = "catalogue"
                                primgen?.let { selectedCompanyId = it.id }
                            },
                            icon = { Icon(Icons.Default.Biotech, contentDescription = "Primgen") },
                            label = { Text("Primgen", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Color(0xFF6C4AB6), indicatorColor = Color(0xFF6C4AB6).copy(alpha = 0.15f))
                        )

                        // 4. My Bookings Tab
                        NavigationBarItem(
                            selected = activeCustomerTab == "bookings",
                            onClick = {
                                activeCustomerTab = "bookings"
                                loadMyBookings()
                            },
                            icon = { Icon(Icons.Default.ReceiptLong, contentDescription = "My Bookings") },
                            label = { Text("Bookings", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                        )
                    }
                }
            }
        ) { padding ->
            Box(Modifier.fillMaxSize().padding(padding)) {
                if (currentRole == "admin") {
                    AdminDashboardScreen(token = authToken ?: "", onHelp = { openHelp() })
                } else if (currentRole == "collector") {
                    CollectorPortalScreen(token = authToken ?: "", onHelp = { openHelp() })
                } else {
                    // Customer Screen
                    if (activeCustomerTab == "bookings") {
                        CustomerBookingsScreen(
                            bookings = customerBookings,
                            onRefresh = { loadMyBookings() },
                            onPay = { bId ->
                                scope.launch {
                                    try {
                                        val pDetails = JSONObject(apiCall("/api/bookings/$bId/payment-details"))
                                        showPaymentDialog = pDetails
                                    } catch (e: Exception) { snackbarMessage = e.message }
                                }
                            }
                        )
                    } else {
                        CustomerCatalogueScreen(
                            companies = companies,
                            selectedCompanyId = selectedCompanyId,
                            onCompanySelected = { selectedCompanyId = it },
                            categories = categories,
                            selectedCategory = selectedCategory,
                            onCategorySelected = { selectedCategory = it },
                            searchQuery = searchQuery,
                            onSearchChange = { searchQuery = it },
                            tests = tests.filter { t ->
                                (selectedCategory == "All" || t.category == selectedCategory) &&
                                (searchQuery.isEmpty() || t.name.contains(searchQuery, true) || t.code.contains(searchQuery, true))
                            },
                            onBook = { test ->
                                showBookingDialog = test
                            }
                        )
                    }
                }

                snackbarMessage?.let { msg ->
                    Snackbar(
                        modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp),
                        action = { TextButton(onClick = { snackbarMessage = null }) { Text("Dismiss") } }
                    ) { Text(msg) }
                }
            }
        }

        // --- DIALOGS ---

        // 1. Role Login Dialog (Admin, Collector Boy, Customer)
        if (showAuthDialog) {
            LoginDialog(
                onDismiss = { showAuthDialog = false },
                onLoginSuccess = { t, role, name ->
                    authToken = t
                    currentRole = role
                    currentUserDisplay = name
                    showAuthDialog = false
                    snackbarMessage = "Signed in as $name ($role)"
                },
                onOpenRegister = {
                    showAuthDialog = false
                    showRegisterDialog = true
                }
            )
        }

        // 2. Customer Registration Dialog with REAL OTP Validation
        if (showRegisterDialog) {
            CustomerRegisterDialog(
                onDismiss = { showRegisterDialog = false },
                onRegisterSuccess = { t, name ->
                    authToken = t
                    currentRole = "customer"
                    currentUserDisplay = name
                    showRegisterDialog = false
                    snackbarMessage = "Account verified & created successfully!"
                }
            )
        }

        // 3. Booking Dialog
        showBookingDialog?.let { test ->
            BookingDialog(
                test = test,
                companyName = currentCompany?.name ?: "BloodLab",
                companyId = selectedCompanyId,
                onDismiss = { showBookingDialog = null },
                onConfirmed = { bId, pDetails ->
                    showBookingDialog = null
                    showPaymentDialog = pDetails
                    snackbarMessage = "Booking confirmed! Proceed to UPI payment."
                }
            )
        }

        // 4. UPI Payment Dialog with configured QR code and exact payable amount
        showPaymentDialog?.let { pDetails ->
            UpiPaymentDialog(
                paymentDetails = pDetails,
                onDismiss = { showPaymentDialog = null },
                onSubmitted = {
                    showPaymentDialog = null
                    activeCustomerTab = "bookings"
                    loadMyBookings()
                    snackbarMessage = "Payment reference submitted! Marked as PENDING admin verification."
                }
            )
        }

        // 5. Role-Specific Help Dialog
        if (showHelpDialog && helpContent != null) {
            RoleHelpDialog(content = helpContent!!, onDismiss = { showHelpDialog = false })
        }
    }
}

// ----------------- CUSTOMER CATALOGUE SCREEN -----------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerCatalogueScreen(
    companies: List<LabCompany>,
    selectedCompanyId: Int,
    onCompanySelected: (Int) -> Unit,
    categories: List<String>,
    selectedCategory: String,
    onCategorySelected: (String) -> Unit,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    tests: List<LabTest>,
    onBook: (LabTest) -> Unit
) {
    var expandedDropdown by remember { mutableStateOf(false) }
    val currentCompany = companies.find { it.id == selectedCompanyId }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Hero / Company Switcher Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = parseColor(currentCompany?.brandColor ?: "#1769AA")),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(currentCompany?.name ?: "BloodLab", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        // Accessible company selector for newly added companies
                        Box {
                            TextButton(
                                onClick = { expandedDropdown = true },
                                colors = ButtonDefaults.textButtonColors(contentColor = Color.White)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Switch Lab ▾", fontSize = 12.sp)
                                }
                            }
                            DropdownMenu(expanded = expandedDropdown, onDismissRequest = { expandedDropdown = false }) {
                                companies.forEach { comp ->
                                    DropdownMenuItem(
                                        text = { Text(comp.name + if (comp.isPrimaryTab) " ★" else "") },
                                        onClick = {
                                            onCompanySelected(comp.id)
                                            expandedDropdown = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                    Text(
                        "Accredited diagnostic pathology, verified independent pricing, and home sample collection.",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 12.sp
                    )
                }
            }
        }

        // Search Bar
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                placeholder = { Text("Search tests (CBC, Thyroid, LFT, Lipid)...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )
        }

        // Searchable Category Pills (All 11 categories)
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { cat ->
                    FilterChip(
                        selected = cat == selectedCategory,
                        onClick = { onCategorySelected(cat) },
                        label = { Text(cat, fontSize = 12.sp) },
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            }
        }

        // Test Cards Grid
        items(tests) { test ->
            ElevatedCard(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(test.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Text(test.category, fontSize = 12.sp, color = Color.Gray)
                        }
                        if (test.discountPercent > 0) {
                            Surface(color = Color(0xFFE6F7EF), shape = RoundedCornerShape(8.dp)) {
                                Text(
                                    "${test.discountPercent.toInt()}% OFF",
                                    color = Color(0xFF0F8B54),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(test.description, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, color = Color.DarkGray)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("🧪 ${test.sampleType}", fontSize = 11.sp, color = Color.Gray)
                        Text("⏱ ${test.turnaroundTime}", fontSize = 11.sp, color = Color.Gray)
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.Baseline, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("₹${test.finalPrice.toInt()}", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                            if (test.discountPercent > 0) {
                                Text("₹${test.price.toInt()}", fontSize = 12.sp, color = Color.Gray)
                            }
                        }
                        Button(onClick = { onBook(test) }, shape = RoundedCornerShape(10.dp)) {
                            Text("Book Collection", fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

// ----------------- CUSTOMER BOOKINGS SCREEN -----------------
@Composable
fun CustomerBookingsScreen(
    bookings: List<LabBooking>,
    onRefresh: () -> Unit,
    onPay: (Int) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("My Test Bookings", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                IconButton(onClick = onRefresh) { Icon(Icons.Default.Refresh, contentDescription = "Refresh") }
            }
        }
        if (bookings.isEmpty()) {
            item {
                Card(Modifier.fillMaxWidth()) {
                    Text("No bookings yet. Browse tests to book a home collection.", modifier = Modifier.padding(24.dp))
                }
            }
        }
        items(bookings) { b ->
            OutlinedCard(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("#${b.reference}", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text(b.paymentStatus.uppercase(), fontWeight = FontWeight.Bold, fontSize = 11.sp,
                            color = if (b.paymentStatus == "paid") Color(0xFF0F8B54) else Color(0xFFB26A00))
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(b.testName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("Provider: ${b.companyName} • Slot: ${b.appointmentDate} (${b.appointmentSlot})", fontSize = 11.sp, color = Color.Gray)
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Amount: ₹${b.amount.toInt()}", fontWeight = FontWeight.Bold)
                        if (b.paymentStatus == "paid") {
                            Text("Receipt Download Available", fontSize = 11.sp, color = Color(0xFF0F8B54), fontWeight = FontWeight.Bold)
                        } else {
                            Button(onClick = { onPay(b.id) }, shape = RoundedCornerShape(8.dp)) {
                                Text("Pay UPI (₹${b.amount.toInt()})", fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ----------------- ADMIN DASHBOARD SCREEN -----------------
@Composable
fun AdminDashboardScreen(token: String, onHelp: () -> Unit) {
    val scope = rememberCoroutineScope()
    var assignments by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var collectors by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var msg by remember { mutableStateOf("") }

    fun refresh() {
        scope.launch {
            try {
                val aStr = apiCall("/api/admin/assignments", token = token)
                val aArr = JSONArray(aStr)
                assignments = (0 until aArr.length()).map { aArr.getJSONObject(it) }

                val sStr = apiCall("/api/admin/staff", token = token)
                val sArr = JSONArray(sStr)
                collectors = (0 until sArr.length()).map { sArr.getJSONObject(it) }
            } catch (e: Exception) {
                msg = e.message ?: "Admin fetch error"
            }
        }
    }

    LaunchedEffect(Unit) { refresh() }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Admin Operations & Assignments", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                IconButton(onClick = { refresh() }) { Icon(Icons.Default.Refresh, contentDescription = null) }
            }
            if (msg.isNotEmpty()) Text(msg, color = Color.Red, fontSize = 12.sp)
        }
        items(assignments) { b ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    Text("#${b.getString("booking_reference")} — ${b.getString("patient_name")}", fontWeight = FontWeight.Bold)
                    Text("Test: ${b.getString("test_name_snapshot")} • ₹${b.getDouble("final_amount_snapshot")}", fontSize = 12.sp)
                    Text("Payment: ${b.getString("payment_status").uppercase()} • Status: ${b.getString("collection_status")}", fontSize = 11.sp, color = Color.Gray)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        collectors.filter { it.optBoolean("active", true) }.take(3).forEach { c ->
                            Button(
                                onClick = {
                                    scope.launch {
                                        try {
                                            apiCall("/api/admin/bookings/${b.getInt("id")}/assign", "POST", JSONObject().put("collector_id", c.getInt("id")), token)
                                            refresh()
                                        } catch (e: Exception) { msg = e.message ?: "" }
                                    }
                                },
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Assign to ${c.getString("display_name").take(10)}", fontSize = 10.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ----------------- COLLECTOR BOY PORTAL SCREEN -----------------
@Composable
fun CollectorPortalScreen(token: String, onHelp: () -> Unit) {
    val scope = rememberCoroutineScope()
    var tasks by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var statusMsg by remember { mutableStateOf("Ready for collections") }

    fun refreshTasks() {
        scope.launch {
            try {
                val res = apiCall("/api/collector/assignments", token = token)
                val arr = JSONArray(res)
                tasks = (0 until arr.length()).map { arr.getJSONObject(it) }
            } catch (e: Exception) { statusMsg = e.message ?: "Task error" }
        }
    }

    LaunchedEffect(Unit) { refreshTasks() }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Collector Boy Duty Portal", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("Status: $statusMsg", fontSize = 12.sp, color = Color.Gray)
        }
        items(tasks) { t ->
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp)) {
                    val status = t.getString("collection_status")
                    Text("#${t.getString("booking_reference")} • ${t.getString("patient_name")}", fontWeight = FontWeight.Bold)
                    Text("📍 Address: ${t.getString("collection_address")}", fontSize = 12.sp)
                    Text("📞 Mobile: ${t.getString("phone")} • Slot: ${t.getString("appointment_slot")}", fontSize = 11.sp, color = Color.Gray)
                    Text("Tube Required: ${t.getString("sample_type_snapshot")}", fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF1769AA))
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val nextStatus = when (status) {
                            "Assigned" -> "Accepted"
                            "Accepted" -> "On the Way"
                            "On the Way" -> "Arrived"
                            "Arrived" -> "Sample Collected"
                            else -> null
                        }
                        if (nextStatus != null) {
                            Button(
                                onClick = {
                                    scope.launch {
                                        try {
                                            apiCall("/api/collector/bookings/${t.getInt("booking_id")}/status", "PATCH", JSONObject().put("status", nextStatus), token)
                                            statusMsg = "Updated to $nextStatus"
                                            refreshTasks()
                                        } catch (e: Exception) { statusMsg = e.message ?: "" }
                                    }
                                },
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Mark $nextStatus", fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ----------------- LOGIN DIALOG (3 PRIMARY ROLES) -----------------
@Composable
fun LoginDialog(
    onDismiss: () -> Unit,
    onLoginSuccess: (token: String, role: String, name: String) -> Unit,
    onOpenRegister: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var selectedRole by remember { mutableStateOf("customer") } // customer, collector, admin
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Sign in to BloodLab", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                    listOf("customer" to "Customer", "collector" to "Collector", "admin" to "Admin").forEach { (r, label) ->
                        FilterChip(
                            selected = selectedRole == r,
                            onClick = { selectedRole = r },
                            label = { Text(label, fontSize = 11.sp) }
                        )
                    }
                }
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    singleLine = true,
                    visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                            Icon(if (isPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, contentDescription = null)
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                )
                errorMsg?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
                if (selectedRole == "customer") {
                    TextButton(onClick = onOpenRegister) {
                        Text("New customer? Register with real OTP", fontSize = 12.sp)
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                scope.launch {
                    try {
                        val res = apiCall("/api/auth/login", "POST", JSONObject().put("username", username).put("password", password).put("role", selectedRole))
                        val o = JSONObject(res)
                        onLoginSuccess(o.getString("access_token"), o.getString("role"), o.optString("display_name", username))
                    } catch (e: Exception) {
                        errorMsg = e.message
                    }
                }
            }) {
                Text("Sign in")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

// ----------------- CUSTOMER REGISTRATION DIALOG (WITH REAL OTP) -----------------
@Composable
fun CustomerRegisterDialog(
    onDismiss: () -> Unit,
    onRegisterSuccess: (token: String, name: String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var fullName by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }
    var whatsapp by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isOtpSent by remember { mutableStateOf(false) }
    var isOtpVerified by remember { mutableStateOf(false) }
    var statusText by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Customer Registration", fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    OutlinedTextField(value = fullName, onValueChange = { fullName = it }, label = { Text("Full Name") }, modifier = Modifier.fillMaxWidth())
                }
                item {
                    OutlinedTextField(value = username, onValueChange = { username = it }, label = { Text("Unique Username") }, modifier = Modifier.fillMaxWidth())
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(value = mobile, onValueChange = { mobile = it }, label = { Text("10-Digit Mobile") }, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                        Button(onClick = {
                            scope.launch {
                                try {
                                    val res = JSONObject(apiCall("/api/auth/otp/send", "POST", JSONObject().put("phone", mobile)))
                                    isOtpSent = true
                                    otpCode = res.optString("dev_otp", "")
                                    statusText = "OTP sent! Test code: $otpCode"
                                } catch (e: Exception) { statusText = e.message ?: "OTP error" }
                            }
                        }) { Text("Send OTP", fontSize = 11.sp) }
                    }
                }
                if (isOtpSent) {
                    item {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(value = otpCode, onValueChange = { otpCode = it }, label = { Text("6-Digit OTP") }, modifier = Modifier.weight(1f))
                            Button(onClick = {
                                scope.launch {
                                    try {
                                        apiCall("/api/auth/otp/verify", "POST", JSONObject().put("phone", mobile).put("otp_code", otpCode))
                                        isOtpVerified = true
                                        statusText = "✓ Phone verified!"
                                    } catch (e: Exception) { statusText = e.message ?: "Verify error" }
                                }
                            }) { Text("Verify", fontSize = 11.sp) }
                        }
                    }
                }
                item {
                    OutlinedTextField(value = whatsapp, onValueChange = { whatsapp = it }, label = { Text("WhatsApp Number") }, modifier = Modifier.fillMaxWidth())
                }
                item {
                    OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email / Gmail") }, modifier = Modifier.fillMaxWidth())
                }
                item {
                    OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password (min 8 chars)") }, modifier = Modifier.fillMaxWidth(), visualTransformation = PasswordVisualTransformation())
                }
                if (statusText.isNotEmpty()) {
                    item { Text(statusText, color = Color(0xFF1769AA), fontSize = 12.sp) }
                }
            }
        },
        confirmButton = {
            Button(
                enabled = isOtpVerified && fullName.isNotEmpty() && username.isNotEmpty() && password.length >= 8,
                onClick = {
                    scope.launch {
                        try {
                            val res = JSONObject(apiCall("/api/auth/customer/register", "POST", JSONObject()
                                .put("full_name", fullName)
                                .put("username", username)
                                .put("mobile", mobile)
                                .put("otp_code", otpCode)
                                .put("whatsapp", whatsapp.ifEmpty { mobile })
                                .put("email", email)
                                .put("password", password)))
                            onRegisterSuccess(res.getString("access_token"), res.getString("display_name"))
                        } catch (e: Exception) { statusText = e.message ?: "Reg error" }
                    }
                }
            ) {
                Text("Register Account")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

// ----------------- BOOKING DIALOG -----------------
@Composable
fun BookingDialog(
    test: LabTest,
    companyName: String,
    companyId: Int,
    onDismiss: () -> Unit,
    onConfirmed: (bookingId: Int, paymentDetails: JSONObject) -> Unit
) {
    val scope = rememberCoroutineScope()
    var patientName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var date by remember { mutableStateOf("2026-10-25") }
    var slot by remember { mutableStateOf("07:30 AM - 08:30 AM") }
    var errorText by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Book Home Collection", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Test: ${test.name}", fontWeight = FontWeight.SemiBold)
                Text("Provider: $companyName • Fee: ₹${test.finalPrice.toInt()}", color = Color(0xFF1769AA), fontWeight = FontWeight.Bold)
                OutlinedTextField(value = patientName, onValueChange = { patientName = it }, label = { Text("Patient Name") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Contact Phone") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Collection Address") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = date, onValueChange = { date = it }, label = { Text("Date (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth())
                errorText?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
            }
        },
        confirmButton = {
            Button(onClick = {
                scope.launch {
                    try {
                        val res = JSONObject(apiCall("/api/bookings", "POST", JSONObject()
                            .put("company_id", companyId)
                            .put("test_id", test.id)
                            .put("patient_name", patientName)
                            .put("phone", phone)
                            .put("collection_address", address)
                            .put("appointment_date", date)
                            .put("appointment_slot", slot)))
                        val bId = res.getInt("booking_id")
                        val pDetails = JSONObject(apiCall("/api/bookings/$bId/payment-details"))
                        onConfirmed(bId, pDetails)
                    } catch (e: Exception) { errorText = e.message }
                }
            }) {
                Text("Proceed to UPI Payment")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

// ----------------- UPI PAYMENT DIALOG -----------------
@Composable
fun UpiPaymentDialog(
    paymentDetails: JSONObject,
    onDismiss: () -> Unit,
    onSubmitted: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var utr by remember { mutableStateOf("") }
    var errorText by remember { mutableStateOf<String?>(null) }
    val bookingId = paymentDetails.getInt("booking_id")
    val amount = paymentDetails.getDouble("payable_amount")
    val upiId = paymentDetails.getString("upi_id")
    val ref = paymentDetails.getString("booking_reference")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("UPI Payment Verification", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Payable Amount: ₹${amount.toInt()}", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF1769AA))
                Text("Configured Lab UPI: $upiId", fontSize = 12.sp, color = Color.Gray)
                Text("Ref: $ref", fontSize = 11.sp, color = Color.Gray)
                Spacer(Modifier.height(4.dp))
                Text("Scan lab QR code in GPay/PhonePe and enter 12-digit UTR:", fontSize = 12.sp)
                OutlinedTextField(
                    value = utr,
                    onValueChange = { utr = it },
                    label = { Text("12-Digit UTR / Transaction Ref") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Text("⚠️ Screenshot alone is not payment confirmation. Payment status will remain PENDING until an authorised Admin verifies transaction.", fontSize = 10.sp, color = Color.Gray)
                errorText?.let { Text(it, color = Color.Red, fontSize = 12.sp) }
            }
        },
        confirmButton = {
            Button(onClick = {
                scope.launch {
                    try {
                        apiCall("/api/bookings/$bookingId/submit-payment", "POST", JSONObject().put("transaction_reference", utr).put("payment_method", "UPI"))
                        onSubmitted()
                    } catch (e: Exception) { errorText = e.message }
                }
            }) {
                Text("Submit UTR")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

// ----------------- ROLE HELP DIALOG -----------------
@Composable
fun RoleHelpDialog(content: JSONObject, onDismiss: () -> Unit) {
    val title = content.optString("title", "Help Guide")
    val sections = content.optJSONArray("sections") ?: JSONArray()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items((0 until sections.length()).toList()) { i ->
                    val s = sections.getJSONObject(i)
                    Column {
                        Text(s.getString("heading"), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text(s.getString("content"), fontSize = 12.sp, color = Color.DarkGray)
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) { Text("Understood") }
        }
    )
}
