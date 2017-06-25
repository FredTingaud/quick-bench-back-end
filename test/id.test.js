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

describe('id version 1', function () {
    it('should return a stable id', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: optim, cppVersion: cppVersion, protocolVersion: 1 }), '630d398cbd8e8c9d76bd3fb17ede3b77abe4302e');
    });
    it('should return different id on optim change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: "0", cppVersion: cppVersion, protocolVersion: 1 }), '1fc0b826d2aaf85cceb587ba9960638b0d36ed74');
    });
    it('should return different id on code change', function () {
        assert.equal(app.makeName({ code: 'hello', compiler: compiler, optim: optim, cppVersion: cppVersion, protocolVersion: 1 }), 'e7b57d1778e7b38505a3581971eb8435bced36ae');
    });
    it('should return different id on compiler change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: 'clang++-4.0', optim: optim, cppVersion: cppVersion, protocolVersion: 1 }), '5dee5060303d5a795b2154d76f87718f8aa7dbdf');
    });
    it('should return different id on cppVersion change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: optim, cppVersion: '98', protocolVersion: 1 }), '1aa1a9c43024dd01eb50f8b42832218f8d4299d9');
    });
})

describe('id version 2', function () {
    it('should return different id on protocolVersion change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: optim, cppVersion: cppVersion, isAnnotated: true, protocolVersion: 2 }), '79521ea600940e871ab08a602b355849706871de');
    });
    it('should return different id on optim change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: "0", cppVersion: cppVersion, isAnnotated: true, protocolVersion: 2 }), 'a60edbed043f9271eb8f2ac33e48ba836d33f6eb');
    });
    it('should return different id on code change', function () {
        assert.equal(app.makeName({ code: 'hello', compiler: compiler, optim: optim, cppVersion: cppVersion, isAnnotated: true, protocolVersion: 2 }), '878de5d52c012f1c6469af9273510412a3607ab8');
    });
    it('should return different id on compiler change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: 'clang++-4.0', optim: optim, cppVersion: cppVersion, isAnnotated: true, protocolVersion: 2 }), '02da5f0e209d2370f0546b5919c754d577a67af9');
    });
    it('should return different id on cppVersion change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: optim, cppVersion: '98', isAnnotated: true, protocolVersion: 2 }), 'c2c8ca7553725f561c05120804638d44318825f6');
    });
    it('should return different id on annotation change', function () {
        assert.equal(app.makeName({ code: startCode, compiler: compiler, optim: optim, cppVersion: cppVersion, isAnnotated: false, protocolVersion: 2 }), '5ccde87699ed42859925307950ec7ce2c2197ddc');
    });
})
