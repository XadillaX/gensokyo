var optimist = require("optimist");
var config = require("./config");

var Gensokyo = require("./lib/base/application");

require("sugar");

// get arguments value
var argv = optimist.usage("Start a certain gensokyo service of `huaban.com`.\nUsage: $0").
    demand("c").
    string("c").
    alias("c", "class").
    string("l").
    alias("l", "logpath").
    string("v").
    alias("v", "loglevel").
    default("v", "TRACE").
    string("h").
    alias("h", "host").
    default("h", "localhost").
    string("p").
    alias("p", "port").
    default("p", "60666").
    describe("c", "The service class in `config/config.servers.js`.").
    describe("l", "The path of log file.").
    describe("v", "The log level [ALL|TRACE|DEBUG|INFO|WARN|ERROR|FATAL].").
    argv;

// find which type this service belongs to via ID
var serverClass = argv.c;
var type = null;
var option = null;

/**
 * server config format:
 *
 *   {
 *     type1: [ { id: ..., service1 }, { id: ..., service2 }, ... ],
 *     type2: [ ... ]
 *   }
 */
for(var key in config.servers) {
    if(key === serverClass) {
        option = Object.clone(config.servers[key], true);
        option.class = key;
    }
}

// watch if service exists
if(null === option) {
    console.log("This service id not exist.");
    process.exit(4);
}

// host & port
option.host = argv.h;
option.port = parseInt(argv.p);
if(isNaN(option.port)) {
    console.log("Wrong port.");
    process.exit(4);
}

// create the server
var gensokyo = new Gensokyo(option, argv);

if(!gensokyo.init()) {
    process.exit(4);
}
