const libquick = require('../src/libquick');

var assert = require('assert');

const startCode = `static void BM_StringCreation(benchmark::State& state) {
  while (state.KeepRunning())
    std::string empty_string;
}
// Register the function as a benchmark
BENCHMARK(BM_StringCreation);

static void BM_StringCopy(benchmark::State& state) {
  std::string x = "hello";
  while (state.KeepRunning())
    std::string copy(x);
}
BENCHMARK(BM_StringCopy);
`;

const request = {
    code: startCode,
    options: {
        compiler: 'clang-5.0',
        optim: 3,
        cppVersion: 17,
        lib: 'llvm'
    },
    isAnnotated: true,
    protocolVersion: 4
};

describe('Save options', function () {
    const firstName = libquick.makeName(request);
    const saved = libquick.optionsToString(request);
    console.log("saved: " + saved);
    const loaded = JSON.parse(saved);
    loaded.code = startCode;
    it('should save enough to reload the request', function () {
        assert.equal(libquick.makeName(loaded), firstName);
    });
})