function deny(r, status, message) {
    r.status = status;
    r.headersOut["Content-Type"] = "application/json";
    r.sendHeader();
    r.send(JSON.stringify({ detail: message }));
    r.finish();
}

function isWriteMethod(method) {
    return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function isCartRoute(uri) {
    return uri.indexOf("/api/cart/") === 0;
}

function isAnonymousAllowed(uri, method) {
    // Cart routes are open (auth by session_id)
    if (isCartRoute(uri)) return true;
    // Anonymous users can create orders (POST /api/orders/)
    if (method === "POST" && (uri === "/api/orders/" || uri === "/api/orders")) return true;
    return false;
}

function checkRoleAccess(uri, method, role) {
    var apiPath = uri.replace(/^\/api\//, "");
    var methodOk = !isWriteMethod(method);

    // Unauthenticated users have no role — only read-only allowed
    if (!role || role === "user") {
        if (methodOk) return null;
        // Allow POST to /api/orders/ (checkout)
        if (method === "POST" && (apiPath === "orders/" || apiPath === "orders")) return null;
        // Allow notification management (mark-read, dismiss, prefs)
        if (apiPath.indexOf("notifications/") === 0) return null;
        return "Access denied.";
    }

    // Admin has full access
    if (role === "admin") return null;

    // Read-only access for all roles
    if (methodOk) return null;

    // ── Cashier ──
    if (role === "cashier") {
        if (apiPath === "orders/pos/") return null;
        if (apiPath === "orders/" || apiPath === "orders") return null;
        return "Access denied. Cashier can only use POS and view products.";
    }

    // ── Warehouse Worker ──
    if (role === "warehouse_worker") {
        if (apiPath.indexOf("inventory/goods-receipts") === 0) return null;
        if (apiPath.indexOf("inventory/stock/transfer") === 0) return null;
        if (apiPath.indexOf("inventory/warehouses") === 0) return null;
        return "Access denied. Warehouse worker can only manage inventory.";
    }

    return "Access denied.";
}

function checkAndProxy(r) {
    var method = r.method;
    var userId = (r.variables.auth_user_id || "").trim();
    var userRole = r.variables.auth_user_role || "user";
    var userEmail = r.variables.auth_user_email || "";
    var userName = r.variables.auth_user_name || "";

    // Allow anonymous writes to open routes
    if (isAnonymousAllowed(r.uri, method)) {
        r.variables.gateway_user_id = userId;
        r.variables.gateway_user_role = userRole;
        r.variables.gateway_user_email = userEmail;
        r.variables.gateway_user_name = userName;
        r.internalRedirect(r.variables.api_backend);
        return;
    }

    // Anonymous writes require authentication
    if (isWriteMethod(method) && !userId) {
        deny(r, 401, "Authentication required");
        return;
    }

    // Role-based access
    var accessDenied = checkRoleAccess(r.uri, method, userRole);
    if (accessDenied) {
        deny(r, 403, accessDenied);
        return;
    }

    r.variables.gateway_user_id = userId;
    r.variables.gateway_user_role = userRole;
    r.variables.gateway_user_email = userEmail;
    r.variables.gateway_user_name = userName;

    r.internalRedirect(r.variables.api_backend);
}

export default { checkAndProxy };
