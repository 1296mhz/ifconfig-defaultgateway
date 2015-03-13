# ifconfig-defaultgateway

ifconfig-defaultgateway is a node.js library to parse ifconfig and get the default gateaway on a linux machine.

Currently only tested on Debian (Raspberry Pi)

## Install

You can install __ifconfig-defaultgateway__ using the Node Package Manager (npm):

    npm install ifconfig-defaultgateway

## Examples
```js
var network = require('ifconfig-defaultgateway');

network.ifconfig(function (err, interfaces) {
    if(err) return console.log(err);
    console.log('\nIFCONFIG INTERFACES:\n', interfaces);
});

network.route(function (err, routes) {
    if(err) return console.log(err);
    console.log('\nROUTE ROUTES:\n', routes);
});

network.getNetworkInfo(function (err, interfaces) {
    if(err) return console.log(err);
    console.log('\nNETWORK INFO INTERFACES (WITH DEFAULT GATEWAY):\n', interfaces);
});
```
