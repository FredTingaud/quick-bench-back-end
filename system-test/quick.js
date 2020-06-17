const libquick = require('../src/libquick');
const expect = require('chai').expect;
const fs = require('fs');

const version = process.env.QB_VERSION;

describe('run docker with version', function () {
    before(function () {
        try {
            fs.unlinkSync('./system-test/testfile/test/test.lock');
        } catch (ignore) {
            //ignore
        }
    });

    it('should have benchmark results', async () => {
        var request = {
            options: {
                compiler: version,
                optim: 3,
                cppVersion: 17,
                lib: "gnu"
            },
            isAnnotated: "true",
            force: "true"
        };
        expect(version).to.be.ok;
        process.env.BENCH_ROOT = process.cwd();
        const done = await libquick.execute('system-test/quick/test', request);
        const parsed = JSON.parse(done.res);
        expect(parsed.benchmarks).to.have.length(2);
        expect(done.annotation).to.be.ok;
        expect(done.annotation.split('\n')).to.have.lengthOf.above(7);
        expect(done.annotation).to.have.string('BM_StringCreation');
        expect(done.annotation).to.have.string('BM_StringCopy');
        //	expect(done.stdout).to.be.empty; // Removed because of a Docker message on my Ubuntu version.
        console.log(done.stdout);
        expect(done.annotation).to.be.ok;
    }).timeout(120000);
});
