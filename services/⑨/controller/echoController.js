var util = require("util");
var Controller = require("../../../lib/base/controller");

/**
 * echo controller
 * @param gensokyo
 * @constructor
 */
var EchoController = function(gensokyo) {
    Controller.call(this, gensokyo);
};

util.inherits(EchoController, Controller);

EchoController.prototype.echo1 = function(req, resp, next) {
    this.logger.info("echo1");
    next();
};

EchoController.prototype.echo2 = function(req, resp, next) {
    this.logger.info("echo2");
    resp.message.ok = true;

    // 测试人品
    if(Number.random(1, 100) < 50) {
        resp.error("You're unlucky!");
        return;
    }

    next();
};

module.exports = EchoController;