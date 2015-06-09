var util = require("util");
var app = null;
var async = require("async");
var Metric = require("metrics");

/**
 * get controller function.
 * @param controller
 * @param keyword
 * @returns function
 */
function getControllerFunc(controller, keyword) {
    if(typeof keyword !== "string") return null;
    if(typeof controller !== "object" || !controller) return null;
    if(typeof controller[keyword] === "function") {
        return controller[keyword].bind(controller);
    }

    return null;
}

/**
 * get the function via key and then push it into wrapper
 *
 * @param key
 * @param src
 * @param dest
 * @param routerName
 * @param type
 * @private
 */
function _letsFill(key, src, dest, routerName, type) {
    var func = getControllerFunc(src, key);
    if(null === func) {
        throw new Error("{type} action `{function}` not exists in router `{router}`.".assign(
            { "function": key.toString(), router: routerName, type: type }
        ));
    }

    dest.push(func);
}

/**
 * fill controllers and filters into the wrapper array
 *
 * @param container
 * @param filter
 * @param controller
 * @param router
 * @param routerName
 */
function fillControllersAndFilters(container, filter, controller, router, routerName) {
    /**
     * @situation   single controller (without object wrapper)
     * @refer       http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L5
     *              http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L6
     */
    if(typeof router === "string" || (util.isArray(router) && router.length === 1)) {
        if(util.isArray(router)) router = router[0];
        _letsFill(router, controller, container.controller, routerName, "Controller");
        return;
    }

    /**
     * @situation   only controller (with only an array in the array)
     * @refer       http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L10
     */
    if(util.isArray(router) && router.length === 1 && util.isArray(router[0])) {
        var c = router[0];
        for(var i = 0; i < c.length; i++) {
            _letsFill(c[i], controller, container.controller, routerName, "Controller");
        }

        return;
    }

    /**
     * @situation   before filter and controller, maybe has after filter (with two or three elements in the array)
     * @refer       http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L14
     *              http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L15
     *              http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L16
     */
    if(util.isArray(router) && router.length >= 2) {
        var minloop = router.length % 4;
        var types = [ "Before filter", "Controller", "After filter" ];

        for(var i = 0; i < minloop; i++) {
            var src = (i === 0 ? filter : (i === 1 ? controller : filter));
            var dest = (i === 0 ? container.before : (i === 1 ? container.controller : container.after));

            // if element is a single string
            if(typeof router[i] === "string") {
                _letsFill(router[i], src, dest, routerName, types[i]);
                continue;
            }

            // if element is an array
            if(util.isArray(router[i])) {
                for(var j = 0; j < router[i].length; j++) {
                    var c = router[i][j];
                    _letsFill(c, src, dest, routerName, types[i]);
                }
            }
        }

        return;
    }

    /**
     * @situation   all in an object
     * @refer       http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L7
     *              http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L11
     *              http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L17
     *              http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L18
     *              http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L21
     *              http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L22
     *              http://gitlab.widget-inc.com/huaban/pinit/blob/feature/rpc-services-structure/gensokyo/services/%E2%91%A8/router/echoRouter.js#L27
     */
    if(typeof router === "object") {
        var srcs = [ filter, controller, filter ];
        var routers = [ router.before, router.ctrller, router.after ];
        var dests = [ container.before, container.controller, container.after ];
        var types = [ "Befoter filter", "Controller", "After filter" ];

        for(var i = 0; i < 3; i++) {
            var src = srcs[i];
            var dest = dests[i];
            var r = routers[i];

            if(typeof r === "string") {
                _letsFill(r, src, dest, routerName, types[i]);
                continue;
            }

            if(util.isArray(r)) {
                for(var j = 0; j < r.length; j++) {
                    var c = r[j];
                    _letsFill(c, src, dest, routerName, types[i]);
                }
            }
        }
    }
}

/**
 * assign the functions to sequence
 *
 * @param before
 * @param controller
 * @param after
 * @param routerName
 * @param keyName
 * @returns {func}
 */
function makeSequence(before, controller, after, routerName, keyName) {
    var sequence = [];
    sequence.add(before);
    sequence.add(controller);
    sequence.add(after);

    // add it to metric
    var timer;
    if(app.useMetric) {
        timer = new Metric.Timer();
        app.metricsServer.addMetric(("{router}.{action}").assign({
            router: routerName,
            action: keyName
        }), timer);
    }

    var func = function(req, resp, callback) {
        if(app.useMetric) {
            req.timer = resp.timer = timer;
        }

        var funcIdx = 0;
        var funcCount = sequence.length;

        app.logger.info("Received a request \"{router}.{action}\".".assign({
            router      : routerName,
            action      : keyName
        }));

        req.startTime = resp.startTime = new Date();

        // do the sequence
        async.whilst(
            function() {
                return funcIdx < funcCount;
            },
            function(next) {
                var func = sequence[funcIdx];
                func(req, resp, function() {
                    funcIdx++;
                    next();
                });
            },
            function(err) {
                if(err) {
                    app.logger.err("An error occurred in `{router}` -> `{action}`: {error}".assign({
                        router      : routerName,
                        action      : keyName,
                        error       : err.message
                    }));
                    return;
                }

                callback();
            }
        );
    };

    return func;
}

/**
 * set gensokyo object
 * @param gensokyo
 */
exports.setGensokyo = function(gensokyo) {
    app = gensokyo;
};

/**
 * integrate the routers into a function sequence wrapper
 *
 * @param filter
 * @param controller
 * @param router
 * @param routerName
 * @returns {{}}
 */
exports.integrate = function(filter, controller, router, routerName) {
    var wrapper = {};

    // wrong router
    if(typeof router !== "object" || !router) {
        app.logger.error(
            "You should read `services/⑨/router/echoRouter.js` to know how to write router file `{routername}`.".
                assign({ routername: routerName })
        );

        process.exit(0);
    }

    // fill the controller container and filter container
    for(var key in router) {
        if(!router.hasOwnProperty(key)) continue;
        var beforeFunc = [], controllerFunc = [], afterFunc = [];

        fillControllersAndFilters({
            before: beforeFunc,
            controller: controllerFunc,
            after: afterFunc
        }, filter, controller, router[key], routerName);

        var funcSequence = makeSequence(beforeFunc, controllerFunc, afterFunc, routerName, key);
        wrapper[key] = funcSequence;
    }

    return wrapper;
};
