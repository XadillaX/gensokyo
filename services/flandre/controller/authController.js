var util = require("util");
var Controller = require("../../../lib/base/controller");

/**
 * auth controller
 * @param gensokyo
 * @constructor
 */
var AuthController = function(gensokyo) {
    Controller.call(this, gensokyo);
};

util.inherits(AuthController, Controller);

module.exports = AuthController;
