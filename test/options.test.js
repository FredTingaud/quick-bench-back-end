import * as libquick from '../src/libquick.js';

import assert from 'assert';

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
    let loaded = {};
    loaded.options = JSON.parse(saved);
    loaded.code = startCode;
    const built = libquick.makeRequest(loaded);

    it('should save enough to reload the request', function () {
        assert.equal(libquick.makeName(built), firstName);
    });
});
