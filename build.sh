#!/usr/bin/env bash
# exit on error
set -o errexit

# Upgrade pip
python3 -m pip install --upgrade pip

# Install build dependencies first
python3 -m pip install --no-cache-dir cmake numpy

# Install dlib with memory constraints
# -j1 limits compilation to 1 core to save memory
export CMAKE_ARGS="-D_USE_CUDA=0"
export CMAKE_BUILD_PARALLEL_LEVEL=1
export MAKEFLAGS="-j1"
python3 -m pip install --no-cache-dir dlib

# Install the rest of the dependencies
python3 -m pip install --no-cache-dir -r requirements.txt