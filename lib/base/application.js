var EventEmitter = require("events").EventEmitter;

var path = require("path");
var util = require("util");
var illyria = require("illyria");
var walk = require("walk");
var fs = require("fs");
var log4js = require("log4js");

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
            if(self.server) {
                return self.server.close(function() {
                    self.server = null;
                    console.log("Server closed.");
                    process.exit(code);
                });
            }
            process.exit(code);
        }

        process.once("exit", cleanBeforeExit.bind(null, 0));
        process.once("SIGINT", cleanBeforeExit.bind(null, 0));
        process.once("uncaughtException", cleanBeforeExit.bind(null, 4));
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
                if(!filename.endsWith("Router.js")) return next();

                // parse router name.
                var routerName = filename.first(filename.length - "Router.js".length);

                // require this router and integrate them.
                try {
                    var router = require(root + filename);
                    self.routers[routerName] = integrateController.integrate(self.filters[routerName], self.controllers[routerName], router, routerName);
                } catch(e) {
                    console.error("An error with {routerName}Router.js.".assign({ routerName: routerName }));
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
                if(!filename.endsWith("Controller.js")) return next();

                // parse controller name.
                var controllerName = filename.first(filename.length - "Controller.js".length);

                // require this controller.
                try {
                    var Controller = require(root + filename);
                    self.controllers[controllerName] = new Controller(self);
                } catch(e) {
                    console.error("An error with {ctrlName}Controller.js".assign({ ctrlName: controllerName }));
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
                if (!filename.endsWith("Filter.js")) return next();

                // parse filter name.
                var filterName = filename.first(filename.length - "Filter.js".length);

                // require this filter.
                try {
                    var Filter = require(root + filename);
                    self.filters[filterName] = new Filter(self);
                } catch(e) {
                    console.error("An error with {filterName}Filter.js".assign({ filterName: filterName }));
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
        this.logPath = this.argv.l;
        var dir = path.dirname(this.logPath);
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
