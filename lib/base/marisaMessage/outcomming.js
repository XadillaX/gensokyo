/**
 * outcomming message
 * @constructor
 */
var OutcommingMessage = function(option) {
    this.gensokyo = option.gensokyo;
    this.server = this.gensokyo.server;

    //this._send = option.sender;
    for(var key in option.sender) {
        this[key] = option.sender[key];
        if(typeof this[key] === "function") {
            this[((key === "send" || key === "error") ? "_" : "") + key] = this[key].bind(this);
        }
    }
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
