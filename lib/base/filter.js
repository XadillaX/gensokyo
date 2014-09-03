/**
 * base filter class (for inheriting)
 * @param gensokyo
 * @constructor
 */
var Filter = function(gensokyo) {
    this.gensokyo = gensokyo;
    this.logger = gensokyo.logger;
};

module.exports = Filter;
