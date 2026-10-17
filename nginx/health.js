// Aggregates real health checks: one internal subrequest per service (/_health/<name> in nginx.conf)
var SERVICES = ["product", "inventory", "order", "auth", "frontend", "notification"];

function probe(r, name) {
    return r.subrequest("/_health/" + name).then(
        function (reply) { return { name: name, reply: reply }; },
        function () { return { name: name, reply: null }; }
    );
}

function brokerConnected(reply) {
    try {
        return JSON.parse(reply.responseText).consumer === "connected";
    } catch (e) {
        return false;
    }
}

function aggregate(r) {
    Promise.all(SERVICES.map(function (name) { return probe(r, name); })).then(function (results) {
        var services = {};
        var healthy = true;
        results.forEach(function (res) {
            var ok = res.reply !== null && res.reply.status >= 200 && res.reply.status < 400;
            healthy = healthy && ok;
            services[res.name] = { status: ok ? "healthy" : "unhealthy" };
            if (res.name === "notification") {
                services.notification.label = "Notifications";
                // RabbitMQ has no HTTP check here; the notification consumer's connection stands in for it
                var broker = ok && brokerConnected(res.reply);
                healthy = healthy && broker;
                services.rabbitmq = { status: broker ? "healthy" : "unhealthy" };
            }
        });
        r.headersOut["Content-Type"] = "application/json";
        r.headersOut["Cache-Control"] = "no-store";
        r.return(200, JSON.stringify({ status: healthy ? "healthy" : "degraded", services: services }));
    });
}

export default { aggregate };
