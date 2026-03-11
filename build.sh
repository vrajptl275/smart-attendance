#!/usr/bin/env bash
# exit on error
set -o errexit

# Force use of pip instead of uv
export UV_SYSTEM_PYTHON=1

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install build dependencies first
pip install --no-cache-dir cmake numpy

# Install dlib with memory constraints
# -j1 limits compilation to 1 core to save memory
export CMAKE_ARGS="-DUSE_AVX_INSTRUCTIONS=0"
export CMAKE_BUILD_PARALLEL_LEVEL=1
export MAKEFLAGS="-j1"
pip install --no-cache-dir --no-build-isolation dlib==19.24.2

# Install face-recognition explicitly to link with installed dlib
pip install --no-cache-dir face-recognition==1.3.0

# Install the rest of the dependencies
pip install --no-cache-dir -r requirements.txt