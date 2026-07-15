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

function checkAndProxy(r) {
    var method = r.method;
    var userId = (r.variables.auth_user_id || "").trim();
    var userRole = r.variables.auth_user_role || "user";
    var userEmail = r.variables.auth_user_email || "";
    var userName = r.variables.auth_user_name || "";
    var apiAccess = r.variables.api_access || "";

    // Cart is fully open (auth by session_id, not by user)
    if (apiAccess === "cart") {
        r.variables.gateway_user_id = userId;
        r.variables.gateway_user_role = userRole;
        r.variables.gateway_user_email = userEmail;
        r.variables.gateway_user_name = userName;
        r.internalRedirect(r.variables.api_backend);
        return;
    }

    // Anonymous users (no userId) can only create orders (POST /api/orders/ base path)
    // Authenticated users go through role-specific checks below
    if (!userId && apiAccess === "orders" && method === "POST" && r.uri.match(/^\/api\/orders\/?$/)) {
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

    // Unauthenticated read-only access
    if (!userId || !userRole || userRole === "user") {
        if (!isWriteMethod(method)) {
            r.variables.gateway_user_id = userId;
            r.variables.gateway_user_role = userRole;
            r.variables.gateway_user_email = userEmail;
            r.variables.gateway_user_name = userName;
            r.internalRedirect(r.variables.api_backend);
            return;
        }
        // Authenticated users can manage their notifications
        if (apiAccess === "notifications") {
            r.variables.gateway_user_id = userId;
            r.variables.gateway_user_role = userRole;
            r.variables.gateway_user_email = userEmail;
            r.variables.gateway_user_name = userName;
            r.internalRedirect(r.variables.api_backend);
            return;
        }
        // Authenticated user role can create online orders
        if (userRole === "user" && apiAccess === "orders" && method === "POST") {
            r.variables.gateway_user_id = userId;
            r.variables.gateway_user_role = userRole;
            r.variables.gateway_user_email = userEmail;
            r.variables.gateway_user_name = userName;
            r.internalRedirect(r.variables.api_backend);
            return;
        }
        deny(r, 403, "Access denied.");
        return;
    }

    // Admin — full access
    if (userRole === "admin") {
        r.variables.gateway_user_id = userId;
        r.variables.gateway_user_role = userRole;
        r.variables.gateway_user_email = userEmail;
        r.variables.gateway_user_name = userName;
        r.internalRedirect(r.variables.api_backend);
        return;
    }

    // Read-only for non-admin roles
    if (!isWriteMethod(method)) {
        r.variables.gateway_user_id = userId;
        r.variables.gateway_user_role = userRole;
        r.variables.gateway_user_email = userEmail;
        r.variables.gateway_user_name = userName;
        r.internalRedirect(r.variables.api_backend);
        return;
    }

    // ── Role-based write access ──
    // Cashier can only create POS orders, not online orders
    if (userRole === "cashier" && apiAccess === "orders") {
        // Only allow POST to /api/orders/pos/
        if (method === "POST" && r.uri.includes("/pos/")) {
            r.variables.gateway_user_id = userId;
            r.variables.gateway_user_role = userRole;
            r.variables.gateway_user_email = userEmail;
            r.variables.gateway_user_name = userName;
            r.internalRedirect(r.variables.api_backend);
            return;
        }
        // Also allow cashier to GET their own orders (read their own POS history)
        if (method === "GET") {
            r.variables.gateway_user_id = userId;
            r.variables.gateway_user_role = userRole;
            r.variables.gateway_user_email = userEmail;
            r.variables.gateway_user_name = userName;
            r.internalRedirect(r.variables.api_backend);
            return;
        }
        // Deny any other orders write access
        deny(r, 403, "Cashier can only create POS orders");
        return;
    }

    if (userRole === "warehouse_worker" && (apiAccess === "inventory")) {
        r.variables.gateway_user_id = userId;
        r.variables.gateway_user_role = userRole;
        r.variables.gateway_user_email = userEmail;
        r.variables.gateway_user_name = userName;
        r.internalRedirect(r.variables.api_backend);
        return;
    }

    deny(r, 403, "Access denied.");
}

export default { checkAndProxy };
