import * as libquick from '../src/libquick.js';

import assert from 'assert';

const OPTIONS = '{"protocolVersion":2,"compiler":"clang++-3.8","optim":"1","cppVersion":"17","isAnnotated":true}';
const OUTPUT = `{
  "context": {
    "date": "2017-06-03 16:27:30",
    "num_cpus": 1,
    "mhz_per_cpu": 2400,
    "cpu_scaling_enabled": false,
    "library_build_type": "release"
  },
  "benchmarks": [
    {
      "name": "BM_StringCreation",
      "iterations": 110509442,
      "real_time": 25,
      "cpu_time": 6,
      "time_unit": "ns"
    },
    {
      "name": "BM_StringCopy",
      "iterations": 32549672,
      "real_time": 86,
      "cpu_time": 22,
      "time_unit": "ns"
    },
    {
      "name": "Noop",
      "iterations": 250612168,
      "real_time": 11,
      "cpu_time": 3,
      "time_unit": "ns"
    }
  ]
}`;
const ANNOTATION = 'Some annotations.';
const INPUT = `#include <benchmark/benchmark_api.h>
static void BM_StringCreation(benchmark::State& state) {
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


static void Noop(benchmark::State& state) {
  while (state.KeepRunning());
}
BENCHMARK(Noop);
BENCHMARK_MAIN()`;
const EXPECTED = {
    code: `static void BM_StringCreation(benchmark::State& state) {
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
`,
    graph: {
        benchmarks: [
            {
                "cpu_time": 6,
                "iterations": 110509442,
                "name": "BM_StringCreation",
                "real_time": 25,
                "time_unit": "ns"
            },
            {
                "cpu_time": 22,
                "iterations": 32549672,
                "name": "BM_StringCopy",
                "real_time": 86,
                "time_unit": "ns",
            },
            {
                "cpu_time": 3,
                "iterations": 250612168,
                "name": "Noop",
                "real_time": 11,
                "time_unit": "ns"
            },
        ],
        context: {
            cpu_scaling_enabled: false,
            date: "2017-06-03 16:27:30",
            library_build_type: "release",
            mhz_per_cpu: 2400,
            num_cpus: 1
        }
    },
    options: {
        compiler: "clang++-3.8",
        cppVersion: "c++17",
        optim: "1",
        protocolVersion: 2
    },
    disassemblyOption: "att",
    annotation: "Some annotations."
};

describe('Return v2 stored file', function () {
    it('should return a stable message with protocol 2', function () {
        return assert.deepEqual(libquick.groupResults([INPUT, OPTIONS, OUTPUT, ANNOTATION]), EXPECTED);
    });
});
