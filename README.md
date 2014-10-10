# Gensokyo [～東方幻想鄉～]

![Gensokyo](gensokyo.jpg)

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

### Router

#### Router Chain

Each server router is a logic chain which is like:

```text
filter1 -> filter2 -> filter... -> logic1 -> logic2 -> logic... -> filter'1 -> filter'2 -> filter'...
```

When server received a message from client, a router chain will be triggered.

The filters before logic are called **before-filter**s and the rests are **after-filter**s.

The process can stop at any step and send the client back a message.

If the process is finished and no any message sent back, Gensokyo will send the message which is dealed in `resp.message` automatically.

#### Router Defination

All the routers are defined in files named `*Router.js` which are under directory `router`.

You should defined a JSON object contains `router name => router chain` key-value pair.

> **Attention:** if your router filename is `fooRouter.js`, all the filter and logic function should in `fooController.js` and `fooFilter.js`.

About the defination, refer to the code below:

```javascript
/**
 * each router example:
 *
 *   + single controller
 *     - foo : "bar"
 *     - foo : [ "bar" ]
 *     - foo : { ctrller: "bar" }
 *
 *   + multi controller
 *     - foo : [ [ "bar1", "bar2" ] ]
 *     - foo : { ctrller: [ "bar1", "bar2" ] }
 *
 *   + with single/multiple `before filter`
 *     - foo : [ "before", "bar" ]                      ///< with only 2 elements in the array
 *     - foo : [ "before", [ "bar1", "bar2" ] ]         ///< with only 2 elements in the array
 *     - foo : [ [ "before1", "before2" ], [ "bar" ] ]  ///< with only 2 elements in the array
 *     - foo : { before: "before", ctrller: "bar" }
 *     - foo : { before: [ "before1", "before2" ], ctrller: "bar" }
 *
 *   + with single/multiple `after filter`
 *     - foo : { ctrller: ..., after: [ ... ] }
 *     - foo : { ctrller: ..., after: "bar" }
 *
 *   + with both `before` and `after` filters
 *     - foo : [ "before", "bar", "after" ]             ///< must with 3 elements in the array
 *     - foo : [ [ ... ], [ ... ], [ ... ] ]            ///< must with 3 elements in the array
 *     - foo : { before: "before" / [ ... ], ctrller: "bar" / [ ... ], after: "after" / [ ... ]}
 */
```

So here's an example of `echoRouter.js`:

```javascript
module.exports = {
    echo1           : [ "before1", "echo2" ],
    echo2           : [ "before1", [ "echo1", "echo2" ], "after1" ],
    echo3           : "echo1",
    echo4           : { before: [ "before1" ], ctrller: "echo1" }
};
```

The code above said

> When server received a router named `echo -> echo2` (`echoRouter.js` and `echo2 chain`), the server will trigger `echo2` chain, so the chain with `EchoFilter::before1`, `EchoController::echo1`, `EchoController::echo2` and `EchoFilter::after1` is triggered.

### Incoming & Outcoming Message

#### Incoming Message

Incoming message usually appears in `function(req, resp, next)`.

`req` is so-called incoming message.

##### req.gensokyo

The Gencokyo object.

##### req.server

The server object.

##### req.router

The router JSON object.

##### req.param

Incoming parameters are inside this value.

##### req.socket

The socket object.

##### req.time

Incoming time.

##### req.routerString()

Return a string like `"echo.echo1"`.

#### Outcoming Message

`resp` is so-called outcoming message.

##### resp.gensokyo

The Gensokyo object.

##### resp.server

The server object.

##### resp.message

You can store all the information you want to send to client in it.

For example:

```javascript
resp.message.foo = "bar";
resp.message.ok = false;
```

After calling `resp.send` manually or after the whole chain, this message will be send to client:

```json
{
    "foo": "bar",
    "ok": false
}
```

##### resp.send()

Send the stored message to client.

If called once, it won't make any sense while calling again.

##### resp.error()

Send an error message to client.

If called once, it won't make any sense while calling again.

#### Helper

```javascript
var helper = require("gensokyo").helper;
```

##### Global

###### helper.global.getModel(modelName)

Get the model in `/model/<modelName>Model.js`.

##### ... (Under Development)
