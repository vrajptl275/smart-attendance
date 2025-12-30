#!/usr/bin/env bash
# exit on error
set -o errexit

# Upgrade pip
python3 -m pip install --upgrade pip setuptools wheel

# Install build dependencies first
python3 -m pip install --no-cache-dir cmake numpy

# Install dlib with memory constraints
# -j1 limits compilation to 1 core to save memory
export CMAKE_ARGS="-D_USE_CUDA=0"
export CMAKE_BUILD_PARALLEL_LEVEL=1
export MAKEFLAGS="-j1"
python3 -m pip install --no-cache-dir --no-build-isolation dlib

# Install face-recognition explicitly to link with installed dlib
python3 -m pip install --no-cache-dir face-recognition

# Install the rest of the dependencies
python3 -m pip install --no-cache-dir -r requirements.txt