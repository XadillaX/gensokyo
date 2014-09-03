var util = require("util");
var Filter = require("../../../lib/base/filter");

var AuthFilter = function(gensokyo) {
    Filter.call(this, gensokyo);
};

util.inherits(AuthFilter, Filter);

module.exports = AuthFilter;
