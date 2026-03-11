# Smart Attendance System

A modern web-based attendance management system built with Flask that streamlines the process of tracking and managing attendance for educational institutions and organizations.

## 🚀 Features

- **User-Friendly Interface**: Clean and intuitive web interface for easy navigation
- **Attendance Tracking**: Efficient system for marking and monitoring attendance
- **Database Management**: Secure storage and retrieval of attendance records
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Real-Time Updates**: Instant attendance recording and reporting
- **Data Export**: Generate attendance reports and analytics

## 🛠️ Technologies Used

- **Backend**: Python, Flask
- **Frontend**: HTML, CSS, JavaScript
- **Database**: SQLite/Database (stored in `database/` directory)
- **Deployment**: Configured for deployment with Procfile and build scripts

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- Python 3.7 or higher
- pip (Python package installer)
- Git

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vrajptl275/smart-attendance.git
   cd smart-attendance
   ```

2. **Create a virtual environment** (recommended)
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up the database**
   ```bash
   # The database will be initialized automatically when you run the application
   # Database files are stored in the database/ directory
   ```

## 🚀 Running the Application

1. **Start the Flask server**
   ```bash
   python app.py
   ```

2. **Access the application**
   
   Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## 📁 Project Structure

```
smart-attendance/
│
├── database/              # Database files and schemas
├── static/               # Static files (CSS, JavaScript, images)
├── templates/            # HTML templates
├── app.py               # Main Flask application
├── requirements.txt     # Python dependencies
├── Procfile            # Deployment configuration
├── build.sh            # Build script for deployment
└── .gitignore          # Git ignore file
```

## 🌐 Deployment

⚠️ **Important**: This application uses face recognition libraries that require C++ compilation. **Vercel is NOT supported.**

### ✅ Recommended: Deploy on Render

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
   - Build time: ~5-10 minutes (due to face recognition compilation)

### Alternative: Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect and deploy

For detailed deployment instructions, see [README-DEPLOYMENT.md](README-DEPLOYMENT.md)

## 🔐 Default Credentials

### First Time Setup

When you first run the application, you may need to configure admin credentials:

**Option 1: Default Admin Account**
- If the system creates a default admin account, use:
  - Email address: `admin@smart.edu`
  - Password: `admin123` (or check `app.py` for default credentials)
  - ⚠️ **Important**: Change the default password immediately after first login

**Option 2: Manual Setup**
- Check the `database/` folder or `app.py` for instructions on creating the first admin account
- You may need to run a setup script or manually insert admin credentials into the database

### User Roles

The system typically supports different user types:
- **Admin**: Full system access - manage users, view all records, generate reports
- **Teacher/Staff**: Mark attendance, view class records
- **Student**: View personal attendance records

## 📊 Usage

1. **First Login**: 
   - Access the application at `http://localhost:5000`
   - Log in with admin credentials (see Default Credentials section above)
   - Change default password if applicable

2. **Administrator Tasks**:
   - Create user accounts for teachers and students
   - Configure classes and subjects
   - Manage attendance settings

3. **Mark Attendance**: 
   - Teachers can mark attendance for their assigned classes
   - Use the attendance interface to record present/absent status

4. **View Records**: 
   - Access attendance history and generate reports
   - Filter by date, class, or individual student

5. **Manage Users**: 
   - Add, edit, or remove students/employees from the system
   - Assign roles and permissions

6. **Export Data**: 
   - Download attendance records in various formats (CSV, PDF, etc.)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/improvement`)
3. Make your changes
4. Commit your changes (`git commit -am 'Add new feature'`)
5. Push to the branch (`git push origin feature/improvement`)
6. Create a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Vraj Patel**
- GitHub: [@vrajptl275](https://github.com/vrajptl275)

## 🐛 Bug Reports

If you discover any bugs, please create an issue on GitHub with the following information:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Screenshots (if applicable)
- Your environment details

## 📧 Contact

For questions or support, please open an issue on the GitHub repository.

## 🙏 Acknowledgments

- Flask framework for the backend structure
- Open source community for various libraries and tools
- Contributors who have helped improve this project

---

⭐ If you find this project useful, please consider giving it a star on GitHub!
