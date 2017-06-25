FROM ubuntu:16.04

MAINTAINER Fred Tingaud <ftingaud@hotmail.com>

USER root

RUN apt-get update && apt-get -y install \
   git \
   cmake \
   clang-3.8 \
   libfreetype6-dev \
   perf-tools-unstable \
   && rm -f /usr/bin/perf \
   && find /usr/lib/linux-tools/ -name perf -exec ln -s {} /usr/bin/perf \; \
   && rm -rf /var/lib/apt/lists/*

ENV CC clang-3.8
ENV CXX clang++-3.8

RUN cd /usr/src/ \
    && git clone https://github.com/google/benchmark.git \
    && mkdir -p /usr/src/benchmark/build/ \
    && cd /usr/src/benchmark/build/ \
    && cmake -DCMAKE_BUILD_TYPE=Release -DBENCHMARK_ENABLE_LTO=true .. \
    && make -j12 \
    && make install

RUN useradd -m -s /sbin/nologin -N -u 1000 builder

USER builder

WORKDIR /home/builder
