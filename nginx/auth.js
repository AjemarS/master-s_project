function checkAndProxy(r) {
    var method = r.method;
    var userId = (r.variables.auth_user_id || "").trim();
    var userRole = r.variables.auth_user_role || "user";
    var userEmail = r.variables.auth_user_email || "";
    var userName = r.variables.auth_user_name || "";

    var optional = (method === "GET" || method === "HEAD" || method === "OPTIONS");

    if (!optional && !userId) {
        r.status = 401;
        r.headersOut["Content-Type"] = "application/json";
        r.sendHeader();
        r.send('{"detail":"Authentication required"}');
        r.finish();
        return;
    }

    r.variables.gateway_user_id = userId;
    r.variables.gateway_user_role = userRole;
    r.variables.gateway_user_email = userEmail;
    r.variables.gateway_user_name = userName;

    r.internalRedirect(r.variables.api_backend);
}

export default { checkAndProxy };
