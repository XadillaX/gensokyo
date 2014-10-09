/**
 * XadillaX created at 2014-09-05 13:40
 *
 * Copyright (c) 2014 Huaban.com, all rights
 * reserved.
 */
var _models = {};

/**
 * get a certain model
 * @param modelName
 * @returns {*}
 */
exports.getModel = function(modelName) {
    if(_models[modelName]) {
        return _models[modelName];
    }

    var path = "../../../../model/" + modelName + "Model";
    var model = require(path);
    _models[modelName] = model;

    return model;
};
