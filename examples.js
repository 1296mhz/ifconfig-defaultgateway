var network = require('./lib/index');

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