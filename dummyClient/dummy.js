/**
 * Created by XadillaX on 14-7-11.
 */
var illyria = require("illyria-pre");
var client = illyria.createClient({
    port            : 60666,
    runTimeout      : 10000,
    retryInterval   : 1000,
    reconnect       : true
});

client.on("error", function(e) {
    console.log(e.message);
    process.exit(0);
});

client.connect(function() {
    setInterval(function() {
        client.rpc("echo", "echo1", {
            "jack": "sparrow"
        }, function(err, result) {
            if(err) console.log(err);
            else console.log(result);
        });
    }, 100);
});
