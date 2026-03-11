#!/usr/bin/env bash
# exit on error
set -o errexit

# Force use of pip instead of uv
export UV_SYSTEM_PYTHON=1

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install build dependencies first
pip install --no-cache-dir cmake

# Install numpy separately to reduce memory usage
pip install --no-cache-dir numpy==1.24.3

# Install dlib with strict memory constraints
# Use minimal flags to reduce compilation memory
export CMAKE_ARGS="-DUSE_AVX_INSTRUCTIONS=0 -DUSE_SSE2_INSTRUCTIONS=0 -DUSE_SSE4_INSTRUCTIONS=0"
export CMAKE_BUILD_PARALLEL_LEVEL=1
export MAKEFLAGS="-j1"
export MAX_JOBS=1

# Install dlib with specific version that compiles faster
pip install --no-cache-dir --no-build-isolation dlib==19.24.2

# Install face-recognition
pip install --no-cache-dir face-recognition==1.3.0

# Install remaining dependencies one by one to save memory
pip install --no-cache-dir Flask==2.3.0
pip install --no-cache-dir Flask-Cors==4.0.0
pip install --no-cache-dir PyJWT==2.8.0
pip install --no-cache-dir opencv-python-headless==4.8.0.74
pip install --no-cache-dir gunicorn==21.2.0

echo "Build completed successfully!"