const express = require('express')
const { spawn } = require("child_process");
var kill  = require('tree-kill');

const app = express()
const port = 8080 
const portStart = 10000;

var ports = {};
var tos = {};
var keys = {};

// logs a message with the currenty date to the console
function log(msg) {
	console.log(new Date().toJSON().slice(0, 19).replace('T', ' ') + ' | ' + msg);
}

// generates a unique port name that is not already being used
function generateUniquePort() {
	var p=0;
	while(true) {
		p = Math.floor(Math.random() * portStart/2);
		if (!ports[p]) {
			break;
		}
	}
	ports[p] = 1;
	return p;
}

// maps port p+portStart to port p+portStart*1.5 using socat
function portMap(k, p) {
	var cmd = spawn("socat", ["TCP4-LISTEN:" + (p + portStart), "TCP4-LISTEN:" + (p + portStart * 1.5)]);

	cmd.on("close", code => {
		log(`Shell closed for ${k} on ${p}`);
		if (keys[k] && keys[k].port == p) {
			delete keys[k].pid;
			killProcessForKey(k);
		}
	});

	cmd.on("error", err => {
		log(`Shell error for ${k} on ${p}`);
		log(err);
		if (keys[k] && keys[k].port == p) {
			delete keys[k].pid;
			killProcessForKey(k);
		}
	});

	return cmd.pid;
}

// kills the process corresponding to key k and cleas things up
function killProcessForKey(k) {
	if (keys[k].to) clearTimeout(keys[k].to);
	if (keys[k].pid) kill(keys[k].pid);
	delete ports[keys[k].port];
	delete keys[k];
}

// init call from the server, gets a key as an input param and returns the port number for the server to connect to
app.get('/init/:k', (req, res) => {
	var k = req.params.k;
	if (keys[k]) {
		killProcessForKey(k);
	}
	var p = generateUniquePort();

	log(`Init ${k} on ${p + portStart}`);

	keys[k] = {};
	keys[k].port = p;
	keys[k].pid = portMap(k, p);
	keys[k].to = setTimeout(killProcessForKey.bind(null, k), 15*60*1000);

	res.send('' + (p + portStart));
});

// connect request call from the client, gets the key as an input, returns the port the client can connect to
app.get('/connect/:k', (req, res) => {
	var k = req.params.k;
	if (keys[k]) {
		res.send('' + (keys[k].port + portStart * 1.5));
		log(`Connect ${k} on ${keys[k].port + portStart}`);
	} else {
		log(`Connect: Key not found: ${k}`);
		res.sendStatus(404);
	}
});

// client disconnect call
app.get('/disconnect/:k', (req, res) => {
	var k = req.params.k;
	if (keys[k]) {
		log(`Disconnected ${k} on ${keys[k].port + portStart}`);
		killProcessForKey(k);
		res.send('Done');
	} else {
		log(`Disconnect: Key not found: ${k}`);
		res.sendStatus(404);
	}
});

app.listen(port, () => {
	log(`App listening on ${port}`)
});
