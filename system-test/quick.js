import * as libquick from '../src/libquick.js';
import { expect } from 'chai';
import fs from 'fs';

const version = process.env.QB_VERSION;

function removeIfExists(path) {
    try {
        fs.unlinkSync(path);
    } catch (ignore) {
        //ignore
    }
}

describe('run docker with version', function () {
    before(function () {
        removeIfExists('./system-test/quick/test.lock');
    });

    it('should have benchmark results', async () => {
        const request = {
            options: {
                compiler: version,
                optim: 3,
                cppVersion: "c++1z",
                lib: "gnu",
                flags: []
            },
            disassemblyOption: "att",
            force: "true"
        };
        expect(version).to.be.ok;
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

    if (version.startsWith('clang')) {
        it('should have benchmark results with libcxx', async () => {
            const request = {
                options: {
                    compiler: version,
                    optim: 3,
                    cppVersion: "c++1z",
                    lib: "llvm",
                    flags: []
                },
                disassemblyOption: "att",
                force: "true"
            };
            expect(version).to.be.ok;
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
    }

    after(function () {
        removeIfExists('./system-test/quick/test.out');
        removeIfExists('./system-test/quick/test.perf');
    });
});
