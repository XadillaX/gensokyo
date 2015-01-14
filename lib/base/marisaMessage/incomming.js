/**
 * incomming message
 *
 * @param param
 * @constructor
 */
var IncommingMessage = function(option) {
    this.gensokyo = option.gensokyo;
    this.server = this.gensokyo.server;
    this.router = option.router;
    this.param = option.param;
    this.params = option.params;
    this.socket = option.socket;
    this.time = option.time;
};

/**
 * router string
 * @returns {string}
 */
IncommingMessage.prototype.routerString = function() {
    return this.router.big + "." + this.router.small;
};

module.exports = IncommingMessage;
