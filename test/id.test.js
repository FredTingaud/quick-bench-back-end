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
const compiler = 'clang++-3.8';
const cppVersion = 17;
const optim = 1;

describe('default-id', function () {
    it('should return a stable id', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: optim, cppVersion: cppVersion, protocolVersion: 1 }), '630d398cbd8e8c9d76bd3fb17ede3b77abe4302e');
    });
})

describe('change-optim-id', function () {
    it('should return different id on optim change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: "0", cppVersion: cppVersion, protocolVersion: 1 }), '1fc0b826d2aaf85cceb587ba9960638b0d36ed74');
    });
})

describe('change-code-id', function () {
    it('should return different id on code change', function () {
        assert.equal(app.makeName({ code: 'hello', compiler: compiler, optim: optim, cppVersion: cppVersion, protocolVersion: 1 }), 'e7b57d1778e7b38505a3581971eb8435bced36ae');
    });
})

describe('change-compiler-id', function () {
    it('should return different id on compiler change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: 'clang++-4.0', optim: optim, cppVersion: cppVersion, protocolVersion: 1 }), '5dee5060303d5a795b2154d76f87718f8aa7dbdf');
    });
})

describe('change-cpp-version-id', function () {
    it('should return different id on cppVersion change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: optim, cppVersion: '98', protocolVersion: 1 }), '1aa1a9c43024dd01eb50f8b42832218f8d4299d9');
    });
})

describe('change-protocol-version-id', function () {
    it('should return different id on protocolVersion change', function () {
        assert.equal('2b8c22dd9071f57b8782cec18c7d7e3cc0e116ca', app.makeName({ code: startCode, compiler: compiler, optim: optim, cppVersion: cppVersion, protocolVersion: 2 }));
    });
})
