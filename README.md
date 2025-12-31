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

This project is configured for deployment on platforms like Heroku or Render.

### Deploy to Heroku

```bash
heroku create your-app-name
git push heroku main
```

### Deploy to Render

1. Connect your GitHub repository to Render
2. The `build.sh` script will handle the build process automatically
3. Use the `Procfile` for web service configuration

## 📊 Usage

1. **Administrator Access**: Log in with admin credentials to manage the system
2. **Mark Attendance**: Use the attendance interface to record attendance
3. **View Records**: Access attendance history and generate reports
4. **Manage Users**: Add, edit, or remove students/employees from the system
5. **Export Data**: Download attendance records in various formats

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
