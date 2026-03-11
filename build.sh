#!/usr/bin/env bash
# exit on error
set -o errexit

# Clear any cached builds
rm -rf /opt/render/.cache/*

# Force use of pip instead of uv
export UV_SYSTEM_PYTHON=1

# Upgrade pip with minimal memory
pip install --upgrade pip

# Install cmake from system package manager (faster, less memory)
apt-get update && apt-get install -y cmake

# Install numpy with pre-built wheel (no compilation)
pip install --no-cache-dir numpy==1.24.3

# Install dlib with EXTREME memory constraints
export DLIB_NO_GUI_SUPPORT=1
export CMAKE_ARGS="-DUSE_AVX_INSTRUCTIONS=0 -DUSE_SSE2_INSTRUCTIONS=0 -DUSE_SSE4_INSTRUCTIONS=0 -DDLIB_NO_GUI_SUPPORT=1"
export CMAKE_BUILD_PARALLEL_LEVEL=1
export MAKEFLAGS="-j1"
export MAX_JOBS=1
export CFLAGS="-O1"
export CXXFLAGS="-O1"

# Use older dlib version that compiles with less memory
pip install --no-cache-dir --no-build-isolation dlib==19.22.0

# Install face-recognition
pip install --no-cache-dir face-recognition==1.3.0

# Install remaining dependencies
pip install --no-cache-dir Flask==2.3.0
pip install --no-cache-dir Flask-Cors==4.0.0
pip install --no-cache-dir PyJWT==2.8.0
pip install --no-cache-dir opencv-python-headless==4.8.0.74
pip install --no-cache-dir gunicorn==21.2.0

echo "Build completed successfully!"