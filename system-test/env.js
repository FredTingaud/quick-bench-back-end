const expect = require('chai').expect;

const version = process.env.QB_VERSION;

describe('check compiler version inside docker', function () {
    it('should have the same version', async () => {
        const exec = require('child_process').exec;
        let options = {
            timeout: 60000,
            killSignal: 'SIGKILL'
        };
        const result = await new Promise(resolve => exec(`docker run --rm -v ${__dirname}/env/version.cpp:/home/builder/bench-file.cpp -t fredtingaud/quick-bench:${version} /bin/bash -c "./build && ./run"`, options, (error, stdout, stderr) => {
            resolve(stdout + stderr);
        }));
        expect(result).to.eql(version);
    }).timeout(60000);
});

describe('check available flags', function() {
    it('should contain multiple standards', async() =>{
        const exec = require('child_process').exec;
        let options = {
            timeout: 60000,
            killSignal: 'SIGKILL'
        };
        const result = await new Promise(resolve => exec(`docker run --rm -t fredtingaud/quick-bench:${version} /bin/bash -c "./about-me"`, options, (error, stdout, stderr) => {
            resolve(stdout + stderr);
        }));
        // No idea why but despite the whole chain being unix talking to unix, we get a bunch of \r in chai results.
        expect(result.replaceAll('\r', '')).to.be.a('string').and.satisfy(msg => msg.startsWith('[version]\n1\n[std]'));
        expect(result).to.have.string('c++11');
    })
})
