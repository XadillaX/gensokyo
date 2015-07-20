var EventEmitter = require("events").EventEmitter;

var path = require("path");
var util = require("util");
var illyria = require("illyria");
var walk = require("walk");
var fs = require("fs");
var log4js = require("log4js");
var riemann = require("./lib/riemann");
var async = require("async");

var integrateController = require("./lib/integrateController");
var illyriaExposer = require("./lib/illyriaExposer");

/**
 * zookeeper timeout
 * @param gensokyo
 * @private
 */
var _zkTimeout = function(gensokyo) {
    if(!gensokyo.zkConnected) {
        gensokyo.logger.fatal("Couldn't connect to Zookeeper server.");
        process.exit(4);
    }
};

/**
 * a gensokyo service base application
 * @param option
 * @constructor
 */
var Gensokyo = function(option) {
    this.option = option || {};

    // default values
    if(!this.option.host)      this.option.host      = "127.0.0.1";
    if(!this.option.port)      this.option.port      = 3721;
    if(!this.option.class)     this.option.class     = "Untitled";
    if(!this.option.id)        this.option.id        = "Untitled";
    if(!this.option.zookeeper) this.option.zookeeper = {
        connectingString : "127.0.0.1:2181",
        prefix           : "GENSOKYO_",
        root             : "gensokyo"
    };
    if(!this.option.aliasRule) this.option.aliasRule = [];

    if(this.option.metrics) {
        this.useMetrics = true;
        this.metricsStats = require("measured").createCollection();
    }

    this.logger = null;

    this._servicePath = !this.option.rootPath ? null : this.option.rootPath;
    this.servicePath = null;
    this.logPath = null;
    this.paths = null;

    this.server = null;
    this.zkConnected = false;

    this.controllers = {};
    this.routers = {};
    this.filters = {};

    // TODO: using ORM.
    this.models = {};
    
    EventEmitter.call(this);
};

util.inherits(Gensokyo, EventEmitter);

Gensokyo.prototype.sendToRiemann = function() {
    if(!this.useRiemann || !this.riemann) return;

    // ask for all routers
    var result = this.metricsStats.toJSON();

    var self = this;
    this.riemann.acquire(function(err, riemann) {
        if(err) {
            console.warn("Cannot get riemann client:", err.message);
            console.warn(err.stack);
            return;
        }

        for(var $router in result) {
            if(!result.hasOwnProperty($router)) continue;
            var m = result[$router];

            var duration = m.histogram;
            var rate = m.meter;

            var ok = {};
            ok.p95 = duration.p95 || 0;
            ok.p99 = duration.p95 || 0;
            ok.p999 = duration.p99 || 0;
            ok.m1 = rate["1MinuteRate"] || 0;
            ok.m5 = rate["5MinuteRate"] || 0;
            ok.m15 = rate["15MinuteRate"] || 0;

            for(var $type in ok) {
                if(!ok.hasOwnProperty($type)) continue;
                riemann.send(riemann.Event({
                    service: $router + "->" + $type,
                    metric: ok[$type],
                    state: "ok",
                    host: self.option["class"] + "@" + self.option.host + ":" + self.option.port
                }));
            }
        }

        self.riemann.release(riemann);
    });
};

/**
 * initialize the application
 * @returns {boolean}
 */
Gensokyo.prototype.start = function() {
    var self = this;

    // check configure
    if(!this.option) {
        console.log("Error: wrong server configuration - 1.");
        return false;
    }
    if(!this.option.host || !this.option.port) {
        console.log("Error: wrong server configuration - 2.");
        return false;
    }

    // service path
    this._servicePath = !this._servicePath ? "../../../../" : this._servicePath;
    this.servicePath = path.resolve(__dirname, this._servicePath);
    this.paths = {
        controller      : this.servicePath + "/controller/",
        filter          : this.servicePath + "/filter/",
        model           : this.servicePath + "/model/",
        router          : this.servicePath + "/router/"
    };

    // initialize logger...
    this._initLogger();

    if(this.useMetrics && this.option.metrics.riemann) {
        this.useRiemann = true;
        riemann.init(this.option);
        this.riemann = riemann.pool;

        // create riemann sender
        this.riemannSendTimer = setInterval(
            this.sendToRiemann.bind(this),
            this.option.metrics.riemann.sendInterval || 5000);
    }

    // controllers...
    this._initControllers();

    // filters...
    this._initFilters();

    // routers...
    integrateController.setGensokyo(this);
    this._initRouters();

    // create the server
    var zkOption = Object.clone(this.option.zookeeper, true);
    if(!zkOption.root) zkOption.root = "gensokyo";
    if(this.option.noZookeeper) zkOption = undefined;
    this.server = illyria.createServer({
        port        : this.option.port,
        host        : this.option.host
    }, zkOption);

    // add routers listeners to illyria server
    for(var bigKey in this.routers) {
        if(!this.routers.hasOwnProperty(bigKey)) continue;
        var router = this.routers[bigKey];
        var exposer = {};

        for(var smallKey in router) {
            if(!router.hasOwnProperty(smallKey)) continue;
            exposer[smallKey] = illyriaExposer.make(this, bigKey, smallKey, router[smallKey]);
        }

        this.server.expose({ name: bigKey, methods: exposer }, { alias: this.option.aliasRule });
    }

    if(!this.option.noZookeeper) this.logger.info("Connecting to Zookeeper...");
    this.server.listen(function() {
        if(!self.option.noZookeeper) self.zkConnected = true;
        self.logger.info("RPC Server of `{cls}` -> `{id}` listened on port {port}.".assign({
            cls     : self.option.class,
            port    : self.option.port,
            id      : self.option.id
        }));

        // listen to exit
        function cleanBeforeExit(code) {
            if(self.riemannSendTimer) clearInterval(self.riemannSendTimer);

            async.parallel({
                riemann: function(callback) {
                    if(self.useRiemann && self.riemann) {
                        var riemann = self.riemann;
                        self.useRiemann = false;
                        self.riemann = undefined;
                        riemann.drain(function() {
                            riemann.destroyAllNow();
                            callback();
                        });
                    } else callback();
                },

                server: function(callback) {
                    if(self.server) {
                        return self.server.close(function() {
                            self.server = null;
                            console.log("Shutting down...");
                            callback();

                            setTimeout(function() {
                                callback();
                            }, 5 * 1000);
                        });
                    } else callback();
                }
            }, function() {
                console.log("Server closed.");
                log4js.shutdown(function() {
                    process.exit(code);
                });
            });
        }

        process.once("exit", cleanBeforeExit.bind(null, 0));
        process.once("SIGINT", cleanBeforeExit.bind(null, 0));
        process.on("message", function(msg) {
            // support for PM2
            if(msg === "shutdown") {
                cleanBeforeExit(0);
            }
        });
        //process.once("uncaughtException", cleanBeforeExit.bind(null, 4));
    });
    if(!this.option.noZookeeper) setTimeout(_zkTimeout, 10 * 1000, this);

    return true;
};

/**
 * initialize routers
 * @private
 */
Gensokyo.prototype._initRouters = function() {
    var self = this;
    walk.walkSync(this.paths.router , {
        listeners   : {
            file    : function(root, fileStat, next) {
                // if not root directory.
                if(path.normalize(root) !== path.normalize(self.paths.router)) return next();

                // check filename.
                var filename = fileStat.name;
                var routerName;
                if(filename.endsWith("Router.js")) {
                    routerName = filename.first(filename.length - "Router.js".length);
                } else if(filename.endsWith("_router.js")) {
                    routerName = filename.first(filename.length - "_router.js".length);
                    routerName = routerName.camelize(false);
                } else {
                    return next();
                }

                // require this router and integrate them.
                try {
                    var router = require(root + filename);
                    self.routers[routerName] = integrateController.integrate(self.filters[routerName], self.controllers[routerName], router, routerName);
                } catch(e) {
                    console.error("An error with {filename}.".assign({ filename: filename }));
                    console.trace(e);
                }

                next();
            },

            nodeError: function(root, nodeStatsArray) {
                self.logger.error(nodeStatsArray.error.message + " (" + nodeStatsArray.name + ")");
            }
        }
    });
};

/**
 * initialize the controllers
 * @private
 */
Gensokyo.prototype._initControllers = function() {
    var self = this;
    walk.walkSync(this.paths.controller, {
        listeners   : {
            file    : function(root, fileStat, next) {
                // if not root directory.
                if(path.normalize(root) !== path.normalize(self.paths.controller)) return next();

                // check filename.
                var filename = fileStat.name;
                var controllerName;
                if(filename.endsWith("Controller.js")) {
                    controllerName = filename.first(filename.length - "Controller.js".length);
                } else if(filename.endsWith("_controller.js")) {
                    controllerName = filename.first(filename.length - "_controller.js".length);
                    controllerName = controllerName.camelize(false);
                } else {
                    return next();
                }

                // require this controller.
                try {
                    var Controller = require(root + filename);
                    self.controllers[controllerName] = new Controller(self);
                } catch(e) {
                    console.error("An error with {filename}.".assign({ filename: filename }));
                    console.trace(e);
                }

                next();
            }
        }
    });
};

/**
 * initialize the filters
 * @private
 */
Gensokyo.prototype._initFilters = function() {
    var self = this;

    walk.walkSync(this.paths.filter, {
        listeners: {
            file: function (root, fileStat, next) {
                // if not root directory.
                if (path.normalize(root) !== path.normalize(self.paths.filter)) return next();

                // check filename.
                var filename = fileStat.name;
                var filterName;
                if(filename.endsWith("Filter.js")) {
                    filterName = filename.first(filename.length - "Filter.js".length);
                } else if(filename.endsWith("_filter.js")) {
                    filterName = filename.first(filename.length - "_filter.js".length);
                    filterName = filterName.camelize(false);
                } else {
                    return next();
                }

                // require this filter.
                try {
                    var Filter = require(root + filename);
                    self.filters[filterName] = new Filter(self);
                } catch(e) {
                    console.error("An error with {filename}.".assign({ filename: filename }));
                    console.trace(e);
                }

                next();
            }
        }
    });
};

/**
 * initialize logger
 * @private
 */
Gensokyo.prototype._initLogger = function() {
    var self = this;

    // check if `--logpath` exists
    if(undefined === this.option.logPath) {
        try {
            this.logPath = path.resolve(__dirname, "../../../../log");
            if (!fs.existsSync(this.logPath)) {
                fs.mkdirSync(this.logPath, "0777");
            }

            this.logPath += "/" + this.option.class;
            if (!fs.existsSync(this.logPath)) {
                fs.mkdirSync(this.logPath, "0777");
            }

            this.logPath += "/" + this.option.id;
            if (!fs.existsSync(this.logPath)) {
                fs.mkdirSync(this.logPath, "0777");
            }
        } catch(err) {
            console.log("Can't create directory for logger: " + err.message);
            process.exit(4);
        }

        this.logPath += "/index.log";
    } else {
        this.logPath = this.option.logPath;
        var dir = path.dirname(this.option.logPath);
        if(!fs.existsSync(dir)) {
            console.log("Log path `{path}` not exists.".assign({ path: dir }));
            process.exit(4);
        }

        if(fs.existsSync(this.logPath) && !fs.statSync(this.logPath).isFile()) {
            console.log("Log filename `{path}` is not a file.".assign({ path: self.logPath }));
            process.exit(4);
        }
    }

    // setup log4js
    var logConfig = {
        appenders           : [
            {
                type        : "console",
                category    : self.option.name
            },
            {
                type        : "file",
                filename    : self.logPath,
                category    : self.option.name,
                backups     : 50,
                maxLogSize  : 1024 * 1024 * 50
            }
        ]
    };
    log4js.configure(logConfig);
    this.logger = log4js.getLogger(self.option.name);

    // log level
    const lvs = "ALL|TRACE|DEBUG|INFO|WARN|ERROR|FATAL".split("|");
    var level = this.option.logLevel;
    if(undefined === lvs.find(level)) level = "TRACE";
    this.logger.setLevel(level);

    console.log = this.logger.info.bind(this.logger);
    console.info = this.logger.info.bind(this.logger);
    console.trace = this.logger.trace.bind(this.logger);
    console.error = this.logger.error.bind(this.logger);
    console.warn = this.logger.warn.bind(this.logger);
    console.debug = this.logger.debug.bind(this.logger);
    console.fatal = this.logger.fatal.bind(this.logger);
};

module.exports = Gensokyo;
