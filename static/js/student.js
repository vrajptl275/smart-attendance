let studentData = null;
let currentStream = null;
let currentSessionData = null;

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        showSection(this.dataset.section);
        toggleSidebar();
    });
});

function showSection(section) {
    stopAllCameras();
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    const titles = {
        'details': 'My Details',
        'registerFace': 'Register Face',
        'markAttendance': 'Mark Attendance',
        'viewReport': 'Reports'
    };
    document.getElementById('pageTitle').textContent = titles[section];

    if (section === 'registerFace') checkFaceRegistration();
    if (section === 'viewReport') loadAttendanceReport();
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || user.role !== 'student') {
        window.location.href = '/';
        return;
    }
    document.getElementById('userName').textContent = user.name || 'Student';
    document.getElementById('userEmail').textContent = user.email || '';
    document.getElementById('userAvatar').textContent = (user.name || 'S')[0].toUpperCase();
}

async function loadStudentData() {
    try {
        const response = await fetch('/api/student/profile', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        studentData = await response.json();
        
        document.getElementById('studentName').textContent = studentData.name;
        document.getElementById('studentEmail').textContent = studentData.email;
        document.getElementById('studentClass').textContent = studentData.class_name;
        document.getElementById('faceStatus').textContent = studentData.face_registered ? '✓ Registered' : '✗ Not Registered';

        const subjectsList = document.getElementById('subjectsList');
        subjectsList.innerHTML = '';
        studentData.subjects.forEach(subject => {
            subjectsList.innerHTML += `
                <div class="subject-card">
                    <h4>${subject.name}</h4>
                    <p>${subject.code}</p>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function checkFaceRegistration() {
    if (studentData && studentData.face_registered) {
        document.getElementById('faceRegistrationStatus').innerHTML = 
            '<div class="alert alert-success"><i class="fas fa-check-circle"></i> Face already registered</div>';
        document.getElementById('startCameraBtn').style.display = 'none';
    } else {
        document.getElementById('faceRegistrationStatus').innerHTML = 
            '<p style="color: #65676b; text-align: center; margin-bottom: 15px;">Register your face for attendance</p>';
        document.getElementById('startCameraBtn').style.display = 'block';
    }
}

async function startCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: 640, height: 480 } 
        });
        document.getElementById('cameraFeed').srcObject = currentStream;
        document.getElementById('cameraSection').style.display = 'block';
        document.getElementById('startCameraBtn').style.display = 'none';
    } catch (error) {
        alert('Camera access denied: ' + error.message);
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    document.getElementById('cameraSection').style.display = 'none';
    document.getElementById('startCameraBtn').style.display = 'block';
}

async function captureFace() {
    const video = document.getElementById('cameraFeed');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');

    try {
        const response = await fetch('/api/student/register-face', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ image: imageData })
        });

        const result = await response.json();
        
        if (response.ok) {
            alert('Face registered successfully!');
            stopCamera();
            loadStudentData();
            checkFaceRegistration();
        } else {
            alert(result.message || 'Registration failed');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function verifyCode() {
    const code = document.getElementById('sessionCodeInput').value;
    
    if (code.length !== 6) {
        showAlert('danger', 'Enter 6-digit code');
        return;
    }

    try {
        const response = await fetch('/api/student/verify-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ code })
        });

        const result = await response.json();

        if (response.ok) {
            if (!studentData.face_registered) {
                showAlert('danger', 'Register your face first!');
                return;
            }

            currentSessionData = result;
            document.getElementById('sessionInfo').textContent = 
                `${result.class_name} - ${result.subject_name}`;
            
            document.getElementById('codeInputSection').style.display = 'none';
            document.getElementById('attendanceCameraSection').style.display = 'block';

            currentStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user', width: 640, height: 480 } 
            });
            document.getElementById('attendanceCamera').srcObject = currentStream;
        } else {
            showAlert('danger', result.message || 'Invalid code');
        }
    } catch (error) {
        showAlert('danger', 'Error: ' + error.message);
    }
}

async function markAttendance() {
    if (!currentSessionData) return;

    const video = document.getElementById('attendanceCamera');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');

    try {
        const response = await fetch('/api/student/mark-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ 
                session_id: currentSessionData.session_id,
                image: imageData 
            })
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('success', 'Attendance marked!');
            setTimeout(() => cancelAttendance(), 2000);
        } else {
            showAlert('danger', result.message || 'Failed');
        }
    } catch (error) {
        showAlert('danger', 'Error: ' + error.message);
    }
}

function cancelAttendance() {
    stopAllCameras();
    document.getElementById('codeInputSection').style.display = 'block';
    document.getElementById('attendanceCameraSection').style.display = 'none';
    document.getElementById('sessionCodeInput').value = '';
    currentSessionData = null;
}

function stopAllCameras() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

async function loadAttendanceReport() {
    try {
        const response = await fetch('/api/student/attendance-report', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await response.json();
        
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = '';

        data.subjects.forEach(subject => {
            const percentage = subject.total > 0 ? 
                ((subject.present / subject.total) * 100).toFixed(1) : 0;
            
            reportContent.innerHTML += `
                <div class="progress-container">
                    <div class="progress-label">
                        <span><strong>${subject.name}</strong> (${subject.code})</span>
                        <span>${subject.present}/${subject.total}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div style="text-align: right; margin-top: 5px; font-size: 13px; color: #65676b;">
                        ${percentage}%
                    </div>
                </div>
            `;
        });

        if (data.subjects.length === 0) {
            reportContent.innerHTML = '<p style="text-align: center; color: #65676b;">No data available</p>';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function showAlert(type, message) {
    const container = document.getElementById('alertContainer');
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'danger' ? 'alert-danger' : 'alert-info';
    container.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

function logout() {
    stopAllCameras();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Initialize
checkAuth();
loadStudentData();