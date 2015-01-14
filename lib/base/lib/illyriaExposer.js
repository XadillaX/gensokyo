var Incomming = require("../marisaMessage/incomming");
var Outcomming = require("../marisaMessage/outcomming");

/**
 * generate an illyria exposer
 *
 * @param gensokyo
 * @param big
 * @param small
 * @param wrapper
 * @returns {func}
 */
exports.make = function(gensokyo, big, small, wrapper) {
    var func = function(req, callback) {
        // incomming object
        var req = new Incomming({
            gensokyo    : gensokyo,
            router      : {
                big     : big,
                small   : small
            },
            param       : req.param.bind(req),
            params      : req.params(),
            socket      : req.socket,

            time        : Date.create()
        });

        // outcomming object
        var resp = new Outcomming({
            gensokyo    : gensokyo,
            sender      : callback
        });

        try {
            // run the function sequence
            wrapper(req, resp, function() {
                if(!resp._sent) {
                    resp.send(resp.message);
                }
            });
        } catch(e) {
            gensokyo.logger.error("An error occurred while processing \"{big}.{small}\": {error}".assign({
                big     : big,
                small   : small,
                error   : e.message
            }));
            console.log(e.stack)

            if(!resp._sent) {
                resp.error(e);
            }
        }
    };

    return func;
};
