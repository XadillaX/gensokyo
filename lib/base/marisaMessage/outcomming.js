/**
 * outcomming message
 * @constructor
 */
var OutcommingMessage = function(option) {
    this.gensokyo = option.gensokyo;
    this.server = this.gensokyo.server;

    /* jshint ignore:start */
    for(var key in option.sender) {
        // important! we shouldn't use `hasOwnProperty` here!
        // if(!option.sender.hasOwnProperty(key)) continue;
        this[key] = option.sender[key];
        if(typeof this[key] === "function") {
            this[([ "send", "error", "json" ].indexOf(key) >= 0 ? "_" : "") + key] = this[key].bind(this);
        }
    }
    /* jshint ignore:end */
    this._sent = false;

    // you can set it when you wanna send message after all filters and controllers done.
    this.message = {};
};

/**
 * send message
 * @param param
 */
OutcommingMessage.prototype.send = function(param) {
    if(this._sent) return;
    this._sent = true;
    this._send(param);
};

/**
 * send error
 * @param err
 */
OutcommingMessage.prototype.error = function(err) {
    if(this._sent) return;
    this._sent = true;
    this._error(err);
};

module.exports = OutcommingMessage;
