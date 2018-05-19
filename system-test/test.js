const app = require('../app');
const expect = require('chai').expect

const version = process.env.QB_VERSION;

describe('run docker with version', function () {
    it('should have benchmark results', async () => {
	var request = {
	    compiler: version,
	    optim: 3,
	    cppVersion: 17,
	    isAnnotated: "true",
	    force: "true"
	};
	expect(version).to.be.ok;
	const done = await app.execute('system-test/testfile/test', request);
	const parsed = JSON.parse(done.res);
	expect(parsed.benchmarks).to.have.length(2);
	//	expect(done.stdout).to.be.empty; // Removed because of a Docker message on my Ubuntu version.
	console.log(done.stdout);
	expect(done.annotation).to.be.ok;
    }).timeout(120000);
})
