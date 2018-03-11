const app = require('../app');

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

const request = { code: startCode, compiler: 'clang-5.0', optim: 3, cppVersion: 17, isAnnotated: true, lib: 'llvm', protocolVersion: 3 };

describe('Save options', function () {
    const firstName = app.makeName(request);
    const saved = app.optionsToString(request);
    const loaded = JSON.parse(saved);
    loaded.code = startCode;
    it('should save enough to reload the request', function () {
        assert.equal(app.makeName(loaded), firstName);
    });
})