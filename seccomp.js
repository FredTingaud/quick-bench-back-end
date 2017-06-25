#!/usr/bin/env node

const fs = require('fs');
const request = require('request');

request('https://raw.githubusercontent.com/moby/moby/master/profiles/seccomp/default.json', function(err, res, body) {
	let source = JSON.parse(body);
	source.syscalls[0].names.push('perf_event_open');
	fs.writeFileSync('seccomp.json', JSON.stringify(source, null, 2));
});
