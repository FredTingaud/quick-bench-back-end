import * as libquick from '../src/libquick.js';
import * as libbuild from '../src/libbuild.js';

import assert from 'assert';

const OPTIONS = '{"protocolVersion":5, "compiler":"clang-17.0","optim":"3","cppVersion":"c++17","lib":"llvm","flags":["-ftest"],"disassemblyOption":"att"}';
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
const PREPROCESSED = `        .text
.file   "cstdio.cpp"
.globl  main                            # -- Begin function main
.p2align        4, 0x90
.type   main,@function
main:                                   # @main
.cfi_startproc`;
const GRAPH = `0.01    0.01    75492   856     8       6       3975
0.01    0.01    74984   600     8       4       3966
0.03    0.00    75608   600     8       4       3975
0.03    0.00    75752   600     8       4       3985
0.01    0.01    75428   600     8       4       3972`;
const INCLUDES = `. /usr/lib/gcc/x86_64-linux-gnu/11/../../../../include/c++/11/cstdio
.. /usr/lib/gcc/x86_64-linux-gnu/11/../../../../include/x86_64-linux-gnu/c++/11/bits/c++config.h
... /usr/lib/gcc/x86_64-linux-gnu/11/../../../../include/x86_64-linux-gnu/c++/11/bits/os_defines.h
.... /usr/include/features.h
..... /usr/include/features-time64.h
...... /usr/include/x86_64-linux-gnu/bits/wordsize.h
...... /usr/include/x86_64-linux-gnu/bits/timesize.h
....... /usr/include/x86_64-linux-gnu/bits/wordsize.h
..... /usr/include/stdc-predef.h
..... /usr/include/x86_64-linux-gnu/sys/cdefs.h
...... /usr/include/x86_64-linux-gnu/bits/wordsize.h
...... /usr/include/x86_64-linux-gnu/bits/long-double.h
..... /usr/include/x86_64-linux-gnu/gnu/stubs.h
...... /usr/include/x86_64-linux-gnu/gnu/stubs-64.h
... /usr/lib/gcc/x86_64-linux-gnu/11/../../../../include/x86_64-linux-gnu/c++/11/bits/cpu_defines.h
... /usr/lib/gcc/x86_64-linux-gnu/11/../../../../include/c++/11/pstl/pstl_config.h
.. /usr/include/stdio.h`;
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
        compiler: "clang-17.0",
        cppVersion: "c++17",
        optim: "3",
        lib: "llvm",
        flags: ["-ftest"],
        protocolVersion: 5
    },
    disassemblyOption: "att",
    annotation: "Some annotations."
};

const EXPECTED_BB = {
  code: `#include <benchmark/benchmark_api.h>
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
BENCHMARK_MAIN()`,
  graph: GRAPH,
  includes: INCLUDES,
  options: {
      compiler: "clang-17.0",
      cppVersion: "c++17",
      optim: "3",
      lib: "llvm",
      flags: ["-ftest"],
      disassemblyOption: "att",
      protocolVersion: 5
  },
  preprocessed: PREPROCESSED,
  asm: "Some annotations.",
  id: "id",
  title: "filename"
};

describe('Return v5 stored file', function () {
  it('QB: should return a stable message with protocol 5', function () {
    return assert.deepEqual(libquick.groupResults([INPUT, OPTIONS, OUTPUT, ANNOTATION]), EXPECTED);
  });
  it('BB: should return a stable message with protocol 5', function () {
    return assert.deepEqual(libbuild.groupResults([INPUT, OPTIONS, GRAPH, INCLUDES, PREPROCESSED, ANNOTATION], 'id', 'filename'), EXPECTED_BB);
  });
});
