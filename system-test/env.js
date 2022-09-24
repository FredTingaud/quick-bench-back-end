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

describe('check available standards', function() {
    it('should contain multiple standards', async() =>{
        const exec = require('child_process').exec;
        let options = {
            timeout: 60000,
            killSignal: 'SIGKILL'
        };
        const result = await new Promise(resolve => exec(`docker run --rm -t fredtingaud/quick-bench:${version} /bin/bash -c "./std-versions"`, options, (error, stdout, stderr) => {
            resolve(stdout + stderr);
        }));
        expect(result).to.not.be.empty();
        expect(result).to.contain('c++11');
    })
})