#!/usr/bin/env node

/*
Copyright (c) 2015 Sam Decrock <sam.decrock@gmail.com>

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var spawn 	= require('child_process').spawn;
var path = require('path');
var fs = require('fs');

function getNetworkInfo (callback) {
	// get all interfaces first:
	ifconfig(function (err, interfaces) {
		if(err) return callback(err);

		// find default gateway in routes:
		route(function (err, routes) {
			if(err) return callback(err);

			// flag UG = route is up and route is to a gateway, so that seems like a default gateway to me
			for (var i = interfaces.length - 1; i >= 0; i--) {
				for (var r = routes.length - 1; r >= 0; r--) {

					if(routes[r].iface == interfaces[i].iface && routes[r].flags == 'UG'){
						interfaces[i].defaultgateway = routes[r].gateway;
						break;
					}
				};
			};


			return callback(null, interfaces);
		});
	});
}



function parseIfconfig (ifconfigString) {
	// ifconfigString should be something like

	// eth0      Link encap:Ethernet  HWaddr b8:27:eb:fe:ba:9a  
	//           inet addr:10.100.11.127  Bcast:10.100.11.255  Mask:255.255.255.0
	//           UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
	//           RX packets:113845 errors:0 dropped:0 overruns:0 frame:0
	//           TX packets:3227 errors:0 dropped:0 overruns:0 carrier:0
	//           collisions:0 txqueuelen:1000 
	//           RX bytes:15883990 (15.1 MiB)  TX bytes:546270 (533.4 KiB)
	//
	// lo        Link encap:Local Loopback  
	//           inet addr:127.0.0.1  Mask:255.0.0.0
	//           UP LOOPBACK RUNNING  MTU:65536  Metric:1
	//           RX packets:0 errors:0 dropped:0 overruns:0 frame:0
	//           TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
	//           collisions:0 txqueuelen:0 
	//           RX bytes:0 (0.0 B)  TX bytes:0 (0.0 B)


	// split interfaces based on 2 newlines:
	var interfaceStrings = ifconfigString.split('\n\n');
	var interfaces = [];
	
	// remove empty ones:
	for(var i in interfaceStrings){
		if(interfaceStrings[i].trim() == ''){
			delete interfaceStrings[i];
		}
	}

	// parse data of each interface:
	for(var i in interfaceStrings){
		var lines = interfaceStrings[i].split('\n');

		// store them in a new object:
		var interface = {};


		for(var lineNumber in lines){
			var line = lines[lineNumber].trim();


			// iface name:
			var match = line.match(/^([^\s]+)/i);
			if(lineNumber == 0 && match && match.length > 0) { // mind the lineNumber check
				interface.iface = match[1].trim();
			}
			
			//mac:
			var match = line.match(/HWaddr(.+)/i);
			if(match && match.length > 0) {
				interface.mac = match[1].trim();
			}

			//ip address:
			var match = line.match(/inet addr:(\b(?:\d{1,3}\.){3}\d{1,3}\b)/i);
			if(match && match.length > 0) {
				interface.ip = match[1].trim();
			}

			//broadcast address:
			var match = line.match(/Bcast:(\b(?:\d{1,3}\.){3}\d{1,3}\b)/i);
			if(match && match.length > 0) {
				interface.broadcast = match[1].trim();
			}
			
			//subnet masK
			var match = line.match(/Mask:(\b(?:\d{1,3}\.){3}\d{1,3}\b)/i);
			if(match && match.length > 0) {
				interface.subnetmask = match[1].trim();
			}
		}

		interfaces.push(interface);
	}

	return interfaces;
}

function parseRoute (routeString) {
	// routeString should be something like:
	//
	// Kernel IP routing table
	// Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
	// 0.0.0.0         10.100.11.1     0.0.0.0         UG    0      0        0 eth0
	// 10.100.11.0     0.0.0.0         255.255.255.0   U     0      0        0 eth0

	// parse out data line by line and store it in an array 'routes':
	var routes = [];

	var lines = routeString.split('\n');
	for (var i = 0; i < lines.length; i++) {
		var route = {};
		var line = lines[i];
		var match = line.match(/(\b(?:\d{1,3}\.){3}\d{1,3}\b)\s+(\b(?:\d{1,3}\.){3}\d{1,3}\b)\s+(\b(?:\d{1,3}\.){3}\d{1,3}\b)\s+([A-z]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([^\s]+)/);
		if(match && match[1]) route.destination = match[1];
		if(match && match[2]) route.gateway = match[2];
		if(match && match[3]) route.genmask = match[3];
		if(match && match[4]) route.flags = match[4];
		if(match && match[5]) route.metric = match[5];
		if(match && match[6]) route.ref = match[6];
		if(match && match[7]) route.use = match[7];
		if(match && match[8]) route.iface = match[8];

		// if object is not empty:
		if(Object.keys(route).length){
			routes.push(route);
		}
	};

	return routes;
}


function ifconfig (callback) {
	var outputArray = [];

	var externalProcess = spawn('ifconfig');

	// here I capture everything the external process outputs (regular output AND error output)
	externalProcess.stdout.on('data', function (data){
		outputArray.push(data);
		
	});
	externalProcess.stderr.on('data', function (data){
		outputArray.push(data);
	});

	// this happens whens the process exits:
	externalProcess.on('close', function (code){
		if(code != 0) return callback(new Error("returned with code " + code));

		// I concatenate everything it has outputted:
		var output = Buffer.concat(outputArray);
		var outputString = output.toString();

		if(callback) return callback(null, parseIfconfig(outputString));
	});
}

function route(callback){
	var outputArray = [];

	var externalProcess = spawn('route', ['-n']);

	// here I capture everything the external process outputs (regular output AND error output)
	externalProcess.stdout.on('data', function (data){
		outputArray.push(data);
		
	});
	externalProcess.stderr.on('data', function (data){
		outputArray.push(data);
	});

	// this happens whens the process exits:
	externalProcess.on('close', function (code){
		if(code != 0) return callback(new Error("returned with code " + code));

		// I concatenate everything it has outputted:
		var output = Buffer.concat(outputArray);
		var outputString = output.toString();
		
		if(callback) return callback(null, parseRoute(outputString));
	});
}


exports.ifconfig = ifconfig;
exports.route = route;
exports.getNetworkInfo = getNetworkInfo;


