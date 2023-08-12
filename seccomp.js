#!/usr/bin/env node

import fs from 'fs';
import https from 'https';

const req = https.request('https://raw.githubusercontent.com/moby/moby/master/profiles/seccomp/default.json', function (res) {
	res.setEncoding('utf-8');
	let body = '';
	res.on('data', function (chunk) {
		body = body + chunk;
	});

	res.on('end', () => {
		let source = JSON.parse(body);
		source.syscalls[0].names.push('perf_event_open');
		fs.writeFileSync('seccomp.json', JSON.stringify(source, null, 2));
	});
}).on('error', (e) => {
	console.error('Error while getting seccomp.js:\n' + e);
});

req.end();
