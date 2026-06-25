function checkOrigin(r) {
    var origin = r.headersIn["Origin"];
    if (!origin) {
        return "";
    }

    // Always allow localhost and 127.0.0.1 (both http and https, any port)
    var localhostRE = /^https?:\/\/localhost(:\d+)?$/;
    var loopbackRE = /^https?:\/\/127\.0\.0\.1(:\d+)?$/;

    if (localhostRE.test(origin) || loopbackRE.test(origin)) {
        return origin;
    }

    // Check against CORS_ORIGINS env var (comma-separated exact origins)
    try {
        var corsOriginsEnv = process.env.CORS_ORIGINS;
        if (corsOriginsEnv) {
            var origins = corsOriginsEnv.split(",").map(function (o) {
                return o.trim();
            });
            for (var i = 0; i < origins.length; i++) {
                if (origins[i] === origin) {
                    return origin;
                }
            }
        }
    } catch (e) {
        // process.env access may be restricted in some contexts
    }

    return "";
}

export default { checkOrigin };
