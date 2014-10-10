/**
 * XadillaX created at 2014-10-09 12:59
 *
 * Copyright (c) 2014 Huaban.com, all rights
 * reserved.
 */
require("sugar");
var Gensokyo = require("./lib/base/application");

exports.Gensokyo = Gensokyo;
exports.Controller = require("./lib/base/controller");
exports.Filter = require("./lib/base/filter");
exports.helper = require("./helper");

/**
 * create a new server
 * @param options
 * @returns {Gensokyo}
 */
exports.createServer = function(options) {
    return new Gensokyo(options);
};
