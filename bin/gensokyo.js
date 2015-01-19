#! /usr/bin/env node
/**
 * XadillaX created at 2014-10-09 14:23
 *
 * Copyright (c) 2014 Huaban.com, all rights
 * reserved.
 */
var path = require("path");
var opts = require("nomnom").script("gensokyo").option("action", {
    position: 0,
    callback: function(val) {
        return (val === "new") ? undefined : "You can only create a Gensokyo Project via `new` so far.";
    },
    list: false,
    help: "only `new` is supported so far.",
    required: true
}).option("name", {
    position: 1,
    callback: function(name) {
        return path.dirname(name) !== "." ? "Wrong project name." : undefined;
    },
    default: "gensokyo",
    help: "project name (directory name as well)."
}).parse();

var projectName = opts.name;
var fs = require("fs");

try {
    fs.mkdirSync(projectName);
} catch(e) {
    if(e.message.indexOf("file already exists") === -1) {
        console.log(e.message);
        process.exit(0);
    }
}

if(!fs.existsSync(projectName)) {
    console.log("Can't create project \"" + projectName + "\".");
    process.exit(0);
}

try {
    var result = fs.readdirSync(projectName);
} catch(e) {
    console.log(e.message);
    process.exit(0);
}

if(result.length !== 0) {
    console.log("Not an empty directory.");
    process.exit(0);
}

// file templates
var run = require("sync-runner");
run("cp -R " + __dirname + "/../_template/* " + projectName);

var walker = require("walk").walk(projectName);
walker.on("file", function(root, fileStats, next) {
    var filename = root + "/" + fileStats.name;
    var text = fs.readFileSync(filename, { encoding: "utf8" });

    text = text.replace(/\{\{\%project name\%\}\}/g, projectName);
    text = text.replace(/\{\{\%project name lowercase\%\}\}/g, projectName.toLowerCase());

    fs.writeFileSync(filename, text, { encoding: "utf8" });

    next();
});

walker.on("end", function() {
    var pkg = require("../package");
    var npmPackage = {
        name: projectName,
        version: "0.0.1",
        description: projectName + " is yet another service.",
        main: "gensokyo.js",
        dependencies: {
            gensokyo: "^" + pkg.version,
            nomnom: "^1.8.0"
        },
        keywords: ["gensokyo", "service"]
    };

    fs.writeFile(projectName + "/package.json", JSON.stringify(npmPackage, true, 2), { encoding: "utf8" });

    console.log("Installing dependencies...");

    var childProcess = require("child_process");
    childProcess.exec("npm install --registry=http://registry.npm.huaban.org", {
        cwd: process.cwd() + "/" + projectName + "/"
    }, function(err, stdout) {
        console.log(stdout);
        console.log(err ? err.message : "Done.");
    });
});

