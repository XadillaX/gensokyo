var util = require("util");
var Filter = require("gensokyo").Filter;

/**
 * echo filter
 * @param gensokyo
 * @constructor
 */
var EchoFilter = function(gensokyo) {
    Filter.call(this, gensokyo);
};

util.inherits(EchoFilter, Filter);

EchoFilter.prototype.before1 = function(req, resp, next) {
    this.logger.info("before1");
    next();
};

EchoFilter.prototype.before2 = function(req, resp, next) {
    this.logger.info("before2");
    next();
};

EchoFilter.prototype.after1 = function(req, resp, next) {
    this.logger.info("after1");
    next();
};

EchoFilter.prototype.after2 = function(req, resp, next) {
    this.logger.info("after2");
    next();
};

module.exports = EchoFilter;
