var util = require("util");
var EventEmitter = require("events").EventEmitter;

/**
 * base controller class (for inheriting)
 * @param gensokyo
 * @constructor
 */
var Controller = function(gensokyo) {
    this.gensokyo = gensokyo;
    this.logger = gensokyo.logger;

    EventEmitter.call(this);
};

util.inherits(Controller, EventEmitter);

module.exports = Controller;
