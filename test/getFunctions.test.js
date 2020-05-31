const app = require('../app-quick');

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

const repeatCode = `
static void CopyStrings(benchmark::State& state) {
  while (state.KeepRunning())
    benchmark::DoNotOptimize(std::string(state.range(0), 'x'));
}
BENCHMARK(CopyStrings)->Arg(5)->Arg(10)->Arg(15)->Arg(16)->Arg(20)->Arg(25);
`;

const spacesCode = `
BENCHMARK( A);
BENCHMARK(B );
BENCHMARK( C );
BENCHMARK( D D );
BENCHMARK   (E);
`

describe('Find functions', function () {
    it('should find simple functions', function () {
        assert.equal(app.getFunctions(startCode), 'BM_StringCreation\nBM_StringCopy\n');
    });
    it('should find repeated benchmarks', function () {
        assert.equal(app.getFunctions(repeatCode), 'CopyStrings\n');
    });
    it('should support spaces arround name', function () {
        assert.equal(app.getFunctions(spacesCode), 'A\nB\nC\nE\n');
    });
})
