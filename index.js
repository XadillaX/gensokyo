/**
 * XadillaX created at 2014-10-09 12:59
 *
 * Copyright (c) 2014 Huaban.com, all rights
 * reserved.
 */
require("sugar");
var Gensokyo = require("./lib/base/application");

/**
 * create a new server
 * @param options
 * @returns {Gensokyo}
 */
exports.createServer = function(options) {
    return new Gensokyo(options);
};
