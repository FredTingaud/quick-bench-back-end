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

describe('symetrical', function () {
    it('should return initial value when wrapping then unwrapping', function () {
        assert.equal(app.unwrapCode(app.wrapCode(startCode)), startCode);
    });
})
