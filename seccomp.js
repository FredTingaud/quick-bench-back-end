#!/usr/bin/env node
const fs = require('fs');

let source = JSON.parse(fs.readFileSync('default.json'), 'utf8');
source.syscalls[0].names.push('perf_event_open');
fs.writeFileSync('seccomp.json', JSON.stringify(source));
