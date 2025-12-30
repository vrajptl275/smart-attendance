"""
Smart Attendance System - Complete Backend
Flask server with SQLite, Face Recognition, and all API endpoints
"""

from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import jwt
import datetime
import os
import base64
import random
import string
import cv2
import numpy as np
import face_recognition
from functools import wraps
from io import BytesIO
import openpyxl

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['DATABASE'] = 'database/attendance.db'
CORS(app)

# Create necessary directories
for dir_path in ['database', 'static/faces', 'static/models']:
    try:
        os.makedirs(dir_path, exist_ok=True)
    except FileExistsError:
        print(f"Warning: '{dir_path}' exists as a file. Please remove it to allow directory creation.")

# ============================================
# DATABASE INITIALIZATION
# ============================================

def init_db():
    """Initialize database with all required tables"""
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    # Users table (admin, teachers, students)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Classes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Subjects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        )
    ''')
    
    # Students table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            face_encoding TEXT,
            face_registered BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        )
    ''')
    
    # Teachers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Teacher-Subject assignments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teacher_subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        )
    ''')
    
    # Attendance sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            class_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id),
            FOREIGN KEY (class_id) REFERENCES classes(id),
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        )
    ''')
    
    # Attendance records
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'present',
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    ''')
    
    # Create default admin
    cursor.execute("SELECT * FROM users WHERE email = ?", ('admin@smart.edu',))
    if not cursor.fetchone():
        hashed_password = generate_password_hash('admin123')
        cursor.execute(
            "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
            ('admin@smart.edu', hashed_password, 'Admin', 'admin')
        )
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# ============================================
# AUTHENTICATION MIDDLEWARE
# ============================================

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data
        except:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

def role_required(role):
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            if current_user['role'] != role:
                return jsonify({'message': 'Unauthorized'}), 403
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator

# ============================================
# DATABASE HELPER FUNCTIONS
# ============================================

def get_db():
    conn = sqlite3.connect(app.config['DATABASE'])
    conn.execute('PRAGMA foreign_keys = ON')
    conn.row_factory = sqlite3.Row
    return conn

def query_db(query, args=(), one=False):
    conn = get_db()
    cursor = conn.execute(query, args)
    rv = cursor.fetchall()
    conn.close()
    return (dict(rv[0]) if rv else None) if one else [dict(row) for row in rv]

# ============================================
# ROUTES - HTML Pages
# ============================================

@app.route('/')
def login_page():
    return render_template('login.html')

@app.route('/admin')
def admin_page():
    return render_template('admin.html')

@app.route('/teacher')
def teacher_page():
    return render_template('teacher.html')

@app.route('/student')
def student_page():
    return render_template('student.html')

# ============================================
# API - LOGIN
# ============================================

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'message': 'Missing credentials'}), 400
    
    user = query_db('SELECT * FROM users WHERE email = ?', 
                    (email,), one=True)
    
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    token = jwt.encode({
        'user_id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, app.config['SECRET_KEY'])
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'role': user['role']
        }
    })

# ============================================
# API - ADMIN ENDPOINTS
# ============================================

@app.route('/api/admin/stats', methods=['GET'])
@token_required
@role_required('admin')
def get_admin_stats(current_user):
    conn = get_db()
    
    classes = conn.execute('SELECT COUNT(*) as count FROM classes').fetchone()['count']
    students = conn.execute('SELECT COUNT(*) as count FROM students').fetchone()['count']
    teachers = conn.execute('SELECT COUNT(*) as count FROM teachers').fetchone()['count']
    subjects = conn.execute('SELECT COUNT(*) as count FROM subjects').fetchone()['count']
    
    conn.close()
    
    return jsonify({
        'classes': classes,
        'students': students,
        'teachers': teachers,
        'subjects': subjects
    })

@app.route('/api/admin/classes', methods=['GET', 'POST'])
@token_required
@role_required('admin')
def manage_classes(current_user):
    if request.method == 'GET':
        classes = query_db('''
            SELECT c.*, COUNT(DISTINCT s.id) as student_count
            FROM classes c
            LEFT JOIN students s ON c.id = s.class_id
            GROUP BY c.id
            ORDER BY c.name
        ''')
        return jsonify(classes)
    
    elif request.method == 'POST':
        data = request.json
        name = data.get('name')
        
        if not name:
            return jsonify({'message': 'Class name required'}), 400
        
        try:
            conn = get_db()
            conn.execute('INSERT INTO classes (name) VALUES (?)', (name,))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Class created successfully'}), 201
        except sqlite3.IntegrityError:
            return jsonify({'message': 'Class already exists'}), 400

@app.route('/api/admin/classes/<int:class_id>', methods=['PUT', 'DELETE'])
@token_required
@role_required('admin')
def manage_single_class(current_user, class_id):
    conn = get_db()
    if request.method == 'DELETE':
        conn.execute('DELETE FROM classes WHERE id = ?', (class_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Class deleted successfully'})

    elif request.method == 'PUT':
        data = request.json
        name = data.get('name')
        if not name:
            return jsonify({'message': 'Class name required'}), 400
        try:
            conn.execute('UPDATE classes SET name = ? WHERE id = ?', (name, class_id))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Class updated successfully'})
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'message': 'Class name already exists'}), 400

@app.route('/api/admin/classes/<int:class_id>/subjects', methods=['GET', 'POST'])
@token_required
@role_required('admin')
def manage_subjects(current_user, class_id):
    if request.method == 'GET':
        subjects = query_db('''
            SELECT * FROM subjects WHERE class_id = ? ORDER BY name
        ''', (class_id,))
        return jsonify(subjects)
    
    elif request.method == 'POST':
        data = request.json
        name = data.get('name')
        code = data.get('code')
        
        if not name or not code:
            return jsonify({'message': 'Subject name and code required'}), 400
        
        conn = get_db()
        conn.execute(
            'INSERT INTO subjects (class_id, name, code) VALUES (?, ?, ?)',
            (class_id, name, code)
        )
        conn.commit()
        conn.close()
        return jsonify({'message': 'Subject created successfully'}), 201

@app.route('/api/admin/classes/<int:class_id>/teachers', methods=['GET', 'POST'])
@token_required
@role_required('admin')
def manage_teachers(current_user, class_id):
    if request.method == 'GET':
        teachers = query_db('''
            SELECT DISTINCT u.id, u.name, u.email, t.id as teacher_id
            FROM users u
            JOIN teachers t ON u.id = t.user_id
            JOIN teacher_subjects ts ON t.id = ts.teacher_id
            WHERE ts.class_id = ?
        ''', (class_id,))
        return jsonify(teachers)
    
    elif request.method == 'POST':
        data = request.json
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        subjects = data.get('subjects', [])
        
        if not name or not email or not password:
            return jsonify({'message': 'All fields required'}), 400
        
        try:
            conn = get_db()
            hashed_password = generate_password_hash(password)
            
            cursor = conn.execute(
                'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
                (email, hashed_password, name, 'teacher')
            )
            user_id = cursor.lastrowid
            
            cursor = conn.execute(
                'INSERT INTO teachers (user_id) VALUES (?)',
                (user_id,)
            )
            teacher_id = cursor.lastrowid
            
            for subject_id in subjects:
                conn.execute(
                    'INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)',
                    (teacher_id, subject_id, class_id)
                )
            
            conn.commit()
            conn.close()
            return jsonify({'message': 'Teacher created successfully'}), 201
        except sqlite3.IntegrityError:
            return jsonify({'message': 'Email already exists'}), 400

@app.route('/api/admin/teachers/<int:teacher_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_teacher(current_user, teacher_id):
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    subjects = data.get('subjects')
    class_id = data.get('class_id')

    if not name or not email:
        return jsonify({'message': 'Name and email required'}), 400

    conn = get_db()
    try:
        teacher = conn.execute('SELECT user_id FROM teachers WHERE id = ?', (teacher_id,)).fetchone()
        if not teacher:
            return jsonify({'message': 'Teacher not found'}), 404
        user_id = teacher['user_id']

        if password:
            hashed = generate_password_hash(password)
            conn.execute('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
                         (name, email, hashed, user_id))
        else:
            conn.execute('UPDATE users SET name = ?, email = ? WHERE id = ?',
                         (name, email, user_id))

        if subjects is not None and class_id:
            conn.execute('DELETE FROM teacher_subjects WHERE teacher_id = ? AND class_id = ?',
                         (teacher_id, class_id))
            for sub_id in subjects:
                conn.execute('INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)',
                             (teacher_id, sub_id, class_id))

        conn.commit()
        return jsonify({'message': 'Teacher updated successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Email already exists'}), 400
    finally:
        conn.close()

@app.route('/api/admin/teachers/<int:teacher_id>/class/<int:class_id>/subjects', methods=['GET'])
@token_required
@role_required('admin')
def get_teacher_class_subjects(current_user, teacher_id, class_id):
    subjects = query_db('SELECT subject_id FROM teacher_subjects WHERE teacher_id = ? AND class_id = ?', 
                       (teacher_id, class_id))
    return jsonify([s['subject_id'] for s in subjects])

@app.route('/api/admin/classes/<int:class_id>/students', methods=['GET', 'POST'])
@token_required
@role_required('admin')
def manage_students(current_user, class_id):
    if request.method == 'GET':
        students = query_db('''
            SELECT u.id, u.name, u.email, s.id as student_id, s.face_registered
            FROM users u
            JOIN students s ON u.id = s.user_id
            WHERE s.class_id = ?
        ''', (class_id,))
        return jsonify(students)
    
    elif request.method == 'POST':
        data = request.json
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        if not name or not email or not password:
            return jsonify({'message': 'All fields required'}), 400
        
        try:
            conn = get_db()
            hashed_password = generate_password_hash(password)
            
            cursor = conn.execute(
                'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
                (email, hashed_password, name, 'student')
            )
            user_id = cursor.lastrowid
            
            conn.execute(
                'INSERT INTO students (user_id, class_id) VALUES (?, ?)',
                (user_id, class_id)
            )
            
            conn.commit()
            conn.close()
            return jsonify({'message': 'Student created successfully'}), 201
        except sqlite3.IntegrityError:
            return jsonify({'message': 'Email already exists'}), 400

@app.route('/api/admin/students/<int:student_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_student(current_user, student_id):
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email:
        return jsonify({'message': 'Name and email required'}), 400

    conn = get_db()
    try:
        student = conn.execute('SELECT user_id FROM students WHERE id = ?', (student_id,)).fetchone()
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        user_id = student['user_id']

        if password:
            hashed = generate_password_hash(password)
            conn.execute('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
                         (name, email, hashed, user_id))
        else:
            conn.execute('UPDATE users SET name = ?, email = ? WHERE id = ?',
                         (name, email, user_id))

        conn.commit()
        return jsonify({'message': 'Student updated successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Email already exists'}), 400
    finally:
        conn.close()

@app.route('/api/admin/subjects/<int:subject_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_subject(current_user, subject_id):
    conn = get_db()
    conn.execute('DELETE FROM subjects WHERE id = ?', (subject_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Subject deleted successfully'})

@app.route('/api/admin/teachers/<int:teacher_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_teacher(current_user, teacher_id):
    conn = get_db()
    user_id = conn.execute('SELECT user_id FROM teachers WHERE id = ?', (teacher_id,)).fetchone()
    if user_id:
        conn.execute('DELETE FROM users WHERE id = ?', (user_id['user_id'],))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Teacher deleted successfully'})

@app.route('/api/admin/students/<int:student_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_student(current_user, student_id):
    conn = get_db()
    user_id = conn.execute('SELECT user_id FROM students WHERE id = ?', (student_id,)).fetchone()
    if user_id:
        conn.execute('DELETE FROM users WHERE id = ?', (user_id['user_id'],))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Student deleted successfully'})

# ============================================
# API - TEACHER ENDPOINTS
# ============================================

@app.route('/api/teacher/profile', methods=['GET'])
@token_required
@role_required('teacher')
def get_teacher_profile(current_user):
    teacher = query_db('''
        SELECT t.id, u.name, u.email
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        WHERE u.id = ?
    ''', (current_user['user_id'],), one=True)
    
    subjects = query_db('''
        SELECT s.name as subject_name, s.code as course_code, c.name as class_name
        FROM teacher_subjects ts
        JOIN subjects s ON ts.subject_id = s.id
        JOIN classes c ON ts.class_id = c.id
        WHERE ts.teacher_id = ?
    ''', (teacher['id'],))
    
    teacher['subjects'] = subjects
    return jsonify(teacher)

@app.route('/api/teacher/classes-subjects', methods=['GET'])
@token_required
@role_required('teacher')
def get_teacher_classes_subjects(current_user):
    teacher = query_db('SELECT id FROM teachers WHERE user_id = ?', 
                      (current_user['user_id'],), one=True)
    
    data = query_db('''
        SELECT DISTINCT c.id as class_id, c.name as class_name,
               s.id as subject_id, s.name as subject_name, s.code as course_code
        FROM teacher_subjects ts
        JOIN classes c ON ts.class_id = c.id
        JOIN subjects s ON ts.subject_id = s.id
        WHERE ts.teacher_id = ?
    ''', (teacher['id'],))
    
    return jsonify(data)

def generate_session_code():
    return ''.join(random.choices(string.digits, k=6))

@app.route('/api/teacher/start-session', methods=['POST'])
@token_required
@role_required('teacher')
def start_session(current_user):
    data = request.json
    class_id = data.get('class_id')
    subject_id = data.get('subject_id')
    
    teacher = query_db('SELECT id FROM teachers WHERE user_id = ?', 
                      (current_user['user_id'],), one=True)
    
    code = generate_session_code()
    
    conn = get_db()
    cursor = conn.execute('''
        INSERT INTO sessions (teacher_id, class_id, subject_id, code)
        VALUES (?, ?, ?, ?)
    ''', (teacher['id'], class_id, subject_id, code))
    
    session_id = cursor.lastrowid
    conn.commit()
    
    session_info = query_db('''
        SELECT s.id, s.code, c.name as class_name, sub.name as subject_name
        FROM sessions s
        JOIN classes c ON s.class_id = c.id
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE s.id = ?
    ''', (session_id,), one=True)
    
    conn.close()
    return jsonify(session_info), 201

@app.route('/api/teacher/session/<int:session_id>/attendance', methods=['GET'])
@token_required
@role_required('teacher')
def get_session_attendance(current_user, session_id):
    attendance = query_db('''
        SELECT u.name, u.email, a.marked_at
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN users u ON s.user_id = u.id
        WHERE a.session_id = ?
        ORDER BY a.marked_at DESC
    ''', (session_id,))
    
    return jsonify(attendance)

@app.route('/api/teacher/session/<int:session_id>/end', methods=['POST'])
@token_required
@role_required('teacher')
def end_session(current_user, session_id):
    conn = get_db()
    conn.execute('''
        UPDATE sessions 
        SET is_active = 0, end_time = CURRENT_TIMESTAMP 
        WHERE id = ?
    ''', (session_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Session ended successfully'})

@app.route('/api/teacher/report', methods=['GET'])
@token_required
@role_required('teacher')
def get_teacher_report(current_user):
    class_id = request.args.get('class_id')
    subject_id = request.args.get('subject_id')
    
    records = query_db('''
        SELECT s.start_time as date, u.name as student_name,
               CASE WHEN a.id IS NOT NULL THEN 'present' ELSE 'absent' END as status
        FROM sessions s
        CROSS JOIN students st
        JOIN users u ON st.user_id = u.id
        LEFT JOIN attendance a ON s.id = a.session_id AND st.id = a.student_id
        WHERE s.class_id = ? AND s.subject_id = ? AND st.class_id = ?
        ORDER BY s.start_time DESC, u.name
    ''', (class_id, subject_id, class_id))
    
    return jsonify({'records': records})

# ============================================
# API - STUDENT ENDPOINTS
# ============================================

@app.route('/api/student/profile', methods=['GET'])
@token_required
@role_required('student')
def get_student_profile(current_user):
    student = query_db('''
        SELECT s.id, u.name, u.email, c.name as class_name, s.face_registered
        FROM students s
        JOIN users u ON s.user_id = u.id
        JOIN classes c ON s.class_id = c.id
        WHERE u.id = ?
    ''', (current_user['user_id'],), one=True)
    
    subjects = query_db('''
        SELECT sub.name, sub.code
        FROM subjects sub
        WHERE sub.class_id = ?
    ''', (query_db('SELECT class_id FROM students WHERE user_id = ?', 
                   (current_user['user_id'],), one=True)['class_id'],))
    
    student['subjects'] = subjects
    return jsonify(student)

@app.route('/api/student/register-face', methods=['POST'])
@token_required
@role_required('student')
def register_face(current_user):
    data = request.json
    image_data = data.get('image')
    
    if not image_data:
        return jsonify({'message': 'No image provided'}), 400
    
    try:
        # Decode base64 image
        image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Detect face and get encoding
        face_locations = face_recognition.face_locations(rgb_image)
        
        if len(face_locations) == 0:
            return jsonify({'message': 'No face detected'}), 400
        
        if len(face_locations) > 1:
            return jsonify({'message': 'Multiple faces detected. Please ensure only one face is visible'}), 400
        
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        face_encoding = face_encodings[0]
        
        # Save encoding to database
        encoding_str = ','.join(map(str, face_encoding))
        
        student = query_db('SELECT id FROM students WHERE user_id = ?', 
                          (current_user['user_id'],), one=True)
        
        conn = get_db()
        conn.execute('''
            UPDATE students 
            SET face_encoding = ?, face_registered = 1 
            WHERE id = ?
        ''', (encoding_str, student['id']))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Face registered successfully'})
    
    except Exception as e:
        return jsonify({'message': f'Error processing image: {str(e)}'}), 500

@app.route('/api/student/verify-code', methods=['POST'])
@token_required
@role_required('student')
def verify_session_code(current_user):
    data = request.json
    code = data.get('code')
    
    student = query_db('SELECT class_id FROM students WHERE user_id = ?', 
                      (current_user['user_id'],), one=True)
    
    session = query_db('''
        SELECT s.id as session_id, s.class_id, c.name as class_name, 
               sub.name as subject_name, sub.id as subject_id
        FROM sessions s
        JOIN classes c ON s.class_id = c.id
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE s.code = ? AND s.is_active = 1
        AND datetime(s.start_time, '+60 seconds') > datetime('now')
    ''', (code,), one=True)
    
    if not session:
        return jsonify({'message': 'Invalid code or session expired'}), 400
    
    if session['class_id'] != student['class_id']:
        return jsonify({'message': 'You are not eligible for this subject'}), 403
    
    return jsonify(session)

@app.route('/api/student/mark-attendance', methods=['POST'])
@token_required
@role_required('student')
def mark_attendance(current_user):
    data = request.json
    session_id = data.get('session_id')
    image_data = data.get('image')
    
    if not session_id or not image_data:
        return jsonify({'message': 'Missing required data'}), 400
    
    try:
        # Get student info
        student = query_db('''
            SELECT id, face_encoding FROM students WHERE user_id = ?
        ''', (current_user['user_id'],), one=True)
        
        if not student['face_encoding']:
            return jsonify({'message': 'Face not registered'}), 400
        
        # Check if already marked
        existing = query_db('''
            SELECT id FROM attendance 
            WHERE session_id = ? AND student_id = ?
        ''', (session_id, student['id']), one=True)
        
        if existing:
            return jsonify({'message': 'Attendance already marked'}), 400
        
        # Decode and verify face
        image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        face_locations = face_recognition.face_locations(rgb_image)
        
        if len(face_locations) == 0:
            return jsonify({'message': 'No face detected'}), 400
        
        if len(face_locations) > 1:
            return jsonify({'message': 'Multiple faces detected. Please ensure only one face is visible'}), 400
        
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        # Compare with stored encoding
        stored_encoding = np.array([float(x) for x in student['face_encoding'].split(',')])
        matches = face_recognition.compare_faces([stored_encoding], face_encodings[0], tolerance=0.4)
        
        if not matches[0]:
            return jsonify({'message': 'Face verification failed'}), 400
        
        # Mark attendance
        conn = get_db()
        conn.execute('''
            INSERT INTO attendance (session_id, student_id, status)
            VALUES (?, ?, 'present')
        ''', (session_id, student['id']))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Attendance marked successfully'})
    
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/api/student/attendance-report', methods=['GET'])
@token_required
@role_required('student')
def get_student_attendance_report(current_user):
    student = query_db('SELECT id, class_id FROM students WHERE user_id = ?', 
                      (current_user['user_id'],), one=True)
    
    subjects = query_db('SELECT id, name, code FROM subjects WHERE class_id = ?', 
                       (student['class_id'],))
    
    report = []
    for subject in subjects:
        total = query_db('''
            SELECT COUNT(*) as count FROM sessions 
            WHERE class_id = ? AND subject_id = ?
        ''', (student['class_id'], subject['id']), one=True)['count']
        
        present = query_db('''
            SELECT COUNT(*) as count FROM attendance a
            JOIN sessions s ON a.session_id = s.id
            WHERE s.class_id = ? AND s.subject_id = ? 
            AND a.student_id = ?
        ''', (student['class_id'], subject['id'], student['id']), one=True)['count']
        
        report.append({
            'name': subject['name'],
            'code': subject['code'],
            'total': total,
            'present': present
        })
    
    return jsonify({'subjects': report})

# ============================================
# RUN SERVER
# ============================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=os.environ.get('FLASK_ENV') != 'production', host='0.0.0.0', port=port)