/**
 * XadillaX created at 2015-07-21 11:09:58 With ♥
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved.
 */
var Riemann = require("riemannjs");
var GenericPool = require("generic-pool");

exports.init = function(options) {
     exports.pool = GenericPool.Pool({
        name: "riemann",
        create: function(callback) {
            var riemann = Riemann.createClient({
                host: options.metrics.riemann.host,
                port: options.metrics.riemann.port,
                transport: options.metrics.riemann.transport || "udp"
            });

            var connectTimeout = options.metrics.riemann.connectTimeout || 5000;

            var timer = setTimeout(function() {
                try {
                    if(riemann.transport === "tcp") {
                        riemann.tcp.end();
                        riemann.tcp.destroy();
                    } else {
                        riemann.udp.close();
                    }
                } catch(e) {
                    //...
                }

                delete riemann[riemann.transport];

                callback(new Error("Connect timeout after " + connectTimeout + "ms while connecting to riemann."));
            }, connectTimeout);

            riemann.on("connect", function() {
                clearTimeout(timer);
                callback(undefined, riemann);
            });

            riemann.on("error", function(err) {
                console.error("An error occurred on Gensokyo Riemann.", err.message);
                console.error(err.stack);
            });

            riemann[riemann.transport].socket.on("close", function() {
                riemann.$closed = true;
            });
        },

        destroy: function(riemann) {
            try {
                riemann.removeAllListeners();
                riemann.disconnect();

                if(riemann.transport === "tcp") {
                    riemann.tcp.end();
                    riemann.tcp.destroy();
                } else {
                    riemann.udp.close();
                }

                delete riemann[riemann.transport];
            } catch(e) {
                //...
            }
        },

        validate: function(client) {
            return client.$closed !== true;
        },

        max: options.metrics.riemann.maxPool || 10,
        min: options.metrics.riemann.minPool || 2,
        idleTimeoutMillis: options.metrics.riemann.idleTimeoutMillis || 30000,
        log: function(str, level) {
            if(level === "verbose") return;
            if(level === "info") level = "log";
            if(str.startsWith("dispense()")) return;
            console[level](str);
        }
     });
};

exports.pool = undefined;
