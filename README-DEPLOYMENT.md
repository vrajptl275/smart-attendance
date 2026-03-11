# Deployment Guide

## ⚠️ Important: Vercel is NOT Supported

This application uses face recognition libraries (`dlib`, `face_recognition`) that require C++ compilation. **Vercel does not support these libraries.**

## ✅ Recommended: Deploy on Render

### Steps to Deploy on Render:

1. **Sign up at [Render.com](https://render.com)**

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select the `smart-attendance` repository

3. **Configure the Service**
   - **Name**: `smart-attendance`
   - **Environment**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn app:app`
   - **Instance Type**: Free (or Starter for better performance)

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - Build time: ~5-10 minutes (due to face recognition compilation)

### Environment Variables (Optional)

Add these in Render dashboard under "Environment":
- `SECRET_KEY`: Your secret key for JWT tokens
- `PYTHON_VERSION`: `3.11`

## Alternative: Deploy on Railway

Railway also supports Python applications with build steps:

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect and deploy

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

Default admin credentials:
- Email: `admin@smart.edu`
- Password: `admin123`

## Why Not Vercel?

Vercel is designed for:
- Serverless functions
- Static sites
- Lightweight Python APIs

It does NOT support:
- C++ library compilation (required for dlib)
- Long build times
- Heavy computational tasks
- Persistent file storage

For face recognition applications, use platforms like:
- ✅ Render
- ✅ Railway
- ✅ Heroku
- ✅ DigitalOcean App Platform
- ✅ AWS EC2 / Google Cloud / Azure VMs
