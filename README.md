# Gensokyo [～東方幻想鄉～]

花瓣网主站服务化核心框架模块。

## Installation

Install `gensokyo` via npm:

```sh
$ npm install -g git+ssh://gitlab@gitlab.widget-inc.com:65422/huaban/gensokyo.git#7e524a9
```

> Current version: #[7e524a9](http://gitlab.widget-inc.com/huaban/gensokyo/tree/7e524a938b13a38f63e26417fa2d49390c3b0f64).

## Usage

Go into any directory, and then type

```sh
$ gensokyo new PROJECT_NAME
```

You will find a new project directory named `PROJECT_NAME` is created.

Inside this directory, there are:

```folder
.
├── config
│   ├── config.server.js
│   ├── config.zookeeper.js
│   └── index.js
├── controller
│   └── echoController.js
├── filter
│   └── echoFilter.js
├── gensokyo.js
├── log
│   └── deleteme
├── node_modules
│   ├── gensokyo
│   └── nomnom
├── package.json
└── router
    └── echoRouter.js
```

### Config

`config` includes some configuration files. for example, you want to add a `config.foo.js` to system, you should add this file into `config` and add a new line in `index.js` to let others can access to it.

### Controller

`controller` includes 真·logic code.

Each controller should named as `*Controller.js`.

This is the code in pre-build controller file `echoController`:

```javascript
var util = require("util");
var Controller = require("gensokyo").Controller;

var EchoController = function(gensokyo) {
    Controller.call(this, gensokyo);
};

util.inherits(EchoController, Controller);

EchoController.prototype.echo1 = function(req, resp, next) {
    this.logger.info("echo1");
    next();
};

EchoController.prototype.echo2 = function(req, resp, next) {
    this.logger.info("echo2");
    resp.message.ok = true;

    // 测试人品
    if(Number.random(1, 100) < 50) {
        resp.error("You're unlucky!");
        return;
    }

    next();
};

module.exports = EchoController;
```

### Filter

There are two types of filters: **before-filter** and **after-filter**.

They are all in `filter` directory and named as `*Filter.js`.

This is the example filter code:

```javascript
var util = require("util");
var Filter = require("gensokyo").Filter;

var EchoFilter = function(gensokyo) {
    Filter.call(this, gensokyo);
};

util.inherits(EchoFilter, Filter);

EchoFilter.prototype.before1 = function(req, resp, next) {
    this.logger.info("before1");
    next();
};

EchoFilter.prototype.before2 = function(req, resp, next) {
    this.logger.info("before2");
    next();
};

EchoFilter.prototype.after1 = function(req, resp, next) {
    this.logger.info("after1");
    next();
};

EchoFilter.prototype.after2 = function(req, resp, next) {
    this.logger.info("after2");
    next();
};

module.exports = EchoFilter;
```
