const expect = require('chai').expect;

const version = process.env.QB_VERSION;

describe('check compiler version inside docker', function () {
    it('should have the same version', async () => {
        const exec = require('child_process').exec;
        let options = {
            timeout: 60000,
            killSignal: 'SIGKILL'
        };
        console.log(`${__dirname}/env/version.cpp`);
        const result = await new Promise(resolve => exec(`docker run --rm -v ${__dirname}/testfile/version.cpp:/home/builder/bench-file.cpp -t fredtingaud/quick-bench:${version} /bin/bash -c "./build && ./run"`, options, (error, stdout, stderr) => {
            resolve(stdout + stderr);
        }));
        expect(result).to.eql(version);
    }).timeout(60000);
});
