FROM ubuntu:16.04

MAINTAINER Fred Tingaud <ftingaud@hotmail.com>

USER root

RUN apt-get update && apt-get -y install \
   git \
   cmake \
   libfreetype6-dev \
   flex \
   bison \
   binutils-dev \
   zlib1g-dev \
   libiberty-dev \
   libelf-dev \
   libmpc-dev \
   g++ \
   curl \
   xz-utils \
   && rm -rf /var/lib/apt/lists/*

ENV CC gcc
ENV CXX g++

RUN cd /usr/src/ \
    && git clone https://github.com/torvalds/linux.git \
    && cd linux \
    && git checkout tags/v4.9 \
    && cd tools/perf \
    && make \
    && cp perf /usr/bin \
    && cd /usr/src \
    && rm -rf linux

ENV GCC_VERSION 7.2.0

RUN curl -fSL "http://ftpmirror.gnu.org/gcc/gcc-$GCC_VERSION/gcc-$GCC_VERSION.tar.xz" -o gcc.tar.xz \
    && mkdir -p /usr/src/gcc \
    && tar -xf gcc.tar.xz -C /usr/src/gcc --strip-components=1 \
    && rm gcc.tar.xz* \
    && cd /usr/src/gcc \
    && mkdir build \
    && cd build \
    && /usr/src/gcc/configure --disable-multilib \
    && make \
    && make install-strip \
    && cd ../.. \
    && rm -rf gcc

RUN cd /usr/src/ \
    && git clone https://github.com/google/benchmark.git \
    && mkdir -p /usr/src/benchmark/build/ \
    && cd /usr/src/benchmark/build/ \
    && cmake -DCMAKE_BUILD_TYPE=Release -DBENCHMARK_ENABLE_LTO=true .. \
    && make -j2 \
    && make install

RUN apt-get autoremove -y git \
    cmake \
    flex \
    bison \
    binutils-dev \
    zlib1g-dev \
    libiberty-dev

RUN useradd -m -s /sbin/nologin -N -u 1000 builder

USER builder

WORKDIR /home/builder
