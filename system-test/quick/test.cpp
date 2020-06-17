#include <benchmark/benchmark.h>
#include <vector>
#include <algorithm>
#include <range/v3/all.hpp>

static void BM_StringCreation(benchmark::State& state) {
  std::vector<int> a = {4, 5, 0, 1, -5};
  while (state.KeepRunning())
    {
      auto v = a;
      std::sort( v.begin(), v.end() );
    }
}
// Register the function as a benchmark
BENCHMARK(BM_StringCreation);

// Define another benchmark
static void BM_StringCopy(benchmark::State& state) {
  std::vector<int> a = {4, 5, 0, 1, -5};
  while (state.KeepRunning())
    {
      auto v = a;
      ranges::sort( v );
    }
}
BENCHMARK(BM_StringCopy);

BENCHMARK_MAIN();
