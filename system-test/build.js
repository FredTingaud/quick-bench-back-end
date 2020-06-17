const libbuild = require('../src/libbuild');
const expect = require('chai').expect;
const fs = require('fs');

const version = process.env.QB_VERSION;

describe('run build-bench', function () {
    before(function () {
        try {
            fs.unlinkSync('./system-test/testfile/test/test.lock');
        } catch (ignore) {
            //ignore
        }
    });

    it('should have build results', async () => {
        const request = {
            compiler: version,
            optim: 3,
            cppVersion: 17,
            lib: "gnu",
            title: "cstdio",
            asm: "att",
            withPP: true
        };
        expect(version).to.be.ok;
        process.env.BENCH_ROOT = process.cwd();
        const done = await libbuild.execute('system-test/build/test', request, 3, true);
        // Time results are rows of 7 elements separated by tabs
        expect(done.res.split('\n')).to.have.lengthOf.above(1);
        expect(done.res.split('\n')[0].split('\t')).to.have.length(7);

        // There should be includes
        expect(done.includes.split('\n')).to.have.lengthOf.above(1);
        expect(done.includes).to.have.string('cstdio');

        // There should be assembly
        expect(done.asm.split('\n')).to.have.lengthOf.above(1);
        expect(done.asm).to.have.string('cstdio');

        // There should be preprocessed code
        expect(done.preprocessed.split('\n')).to.have.lengthOf.above(1);
        expect(done.preprocessed).to.have.string('cstdio');

        expect(done.title).to.equal('cstdio');
    }).timeout(120000);
});
