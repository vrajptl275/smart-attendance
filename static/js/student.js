let studentData = null;
let currentStream = null;
let currentSessionData = null;

// Blink detection variables
let blinkCount = 0;
let eyesWereOpen = true;
let lastBlinkTime = null;
let isDetecting = false;
let detectionLoop = null;
let failedAttempts = 0;
const EAR_THRESHOLD = 0.25;
const BLINK_TIMEOUT = 5000; // 5 seconds
const FACE_DETECTION_INTERVAL = 33; // ~30 FPS
const MAX_FAILED_ATTEMPTS = 3;

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
    
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        showAlert('danger', 'Enter a valid 6-digit code');
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

            // Start camera and blink detection
            await startAttendanceCamera();
        } else {
            showAlert('danger', result.message || 'Invalid code');
        }
    } catch (error) {
        showAlert('danger', 'Error: ' + error.message);
    }
}

async function startAttendanceCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user', 
                width: { ideal: 640 }, 
                height: { ideal: 480 } 
            } 
        });
        
        const video = document.getElementById('attendanceCamera');
        video.srcObject = currentStream;
        
        // Wait for video to be ready
        video.onloadedmetadata = () => {
            video.play();
            // Reset blink detection state
            resetBlinkDetection();
            // Start blink detection loop
            startBlinkDetection();
        };
        
    } catch (error) {
        showAlert('danger', 'Camera access denied: ' + error.message);
    }
}

function resetBlinkDetection() {
    blinkCount = 0;
    eyesWereOpen = true;
    lastBlinkTime = Date.now();
    isDetecting = false;
    updateBlinkCounter();
    updateFeedbackMessage('Position your face in the oval');
    
    if (detectionLoop) {
        clearInterval(detectionLoop);
        detectionLoop = null;
    }
    
    // Hide fallback section initially
    document.getElementById('fallbackSection').style.display = 'none';
}

function startBlinkDetection() {
    isDetecting = true;
    updateFeedbackMessage('Face detected ✓ - Blink 3 times to mark attendance');
    
    detectionLoop = setInterval(() => {
        processFrameForBlinks();
    }, FACE_DETECTION_INTERVAL);
}

function processFrameForBlinks() {
    if (!isDetecting || !currentStream) return;
    
    const video = document.getElementById('attendanceCamera');
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    // Check for timeout
    if (Date.now() - lastBlinkTime > BLINK_TIMEOUT && blinkCount > 0) {
        updateFeedbackMessage('Timeout - Starting over');
        failedAttempts++;
        checkForFallback();
        resetBlinkDetection();
        setTimeout(() => startBlinkDetection(), 1000);
        return;
    }
    
    // Simulate blink detection (replace with actual implementation)
    simulateBlinkDetection();
}

function simulateBlinkDetection() {
    // This is a placeholder function for demonstration
    // In production, replace with actual eye detection and EAR calculation
    
    // Simulate random blink detection for demo (more realistic timing)
    if (Math.random() < 0.015) { // 1.5% chance per frame
        if (eyesWereOpen) {
            // Blink detected!
            eyesWereOpen = false;
            blinkCount++;
            lastBlinkTime = Date.now();
            
            updateBlinkCounter();
            
            // Play sound feedback (optional)
            playBlinkSound();
            
            if (blinkCount === 1) {
                updateFeedbackMessage('Blink 1 detected! 👁️ (2 more needed)');
            } else if (blinkCount === 2) {
                updateFeedbackMessage('Blink 2 detected! 👁️👁️ (1 more needed)');
            } else if (blinkCount >= 3) {
                updateFeedbackMessage('Blink 3 detected! 👁️👁️👁️ Processing...');
                // 3 blinks detected - capture and process
                stopBlinkDetection();
                captureAndVerifyFace();
            }
            
            // Reset eyes state after short delay
            setTimeout(() => {
                eyesWereOpen = true;
            }, 200);
        }
    }
}

function playBlinkSound() {
    // Optional: Play a subtle sound on blink detection
    // You can add an audio element or use Web Audio API
    try {
        // Create a short beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        // Ignore audio errors
    }
}

function checkForFallback() {
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        document.getElementById('fallbackSection').style.display = 'block';
        updateFeedbackMessage('Having trouble? Use manual capture below');
    }
}

function stopBlinkDetection() {
    isDetecting = false;
    if (detectionLoop) {
        clearInterval(detectionLoop);
        detectionLoop = null;
    }
}

function updateBlinkCounter() {
    const counter = document.getElementById('blinkCounter');
    let counterHTML = '';
    
    for (let i = 0; i < 3; i++) {
        if (i < blinkCount) {
            counterHTML += '<span class="blink-dot filled">●</span>';
        } else {
            counterHTML += '<span class="blink-dot empty">○</span>';
        }
    }
    
    counter.innerHTML = counterHTML + ` <span class="blink-text">(${blinkCount}/3)</span>`;
}

function updateFeedbackMessage(message) {
    const feedback = document.getElementById('feedbackMessage');
    feedback.textContent = message;
    
    // Add animation class for blink detection
    if (message.includes('Blink') && message.includes('detected')) {
        feedback.classList.add('blink-detected');
        setTimeout(() => {
            feedback.classList.remove('blink-detected');
        }, 500);
    }
}

async function captureAndVerifyFace() {
    updateFeedbackMessage('📷 Capturing... Hold still');
    
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
            // Success - reset failed attempts
            failedAttempts = 0;
            stopAllCameras();
            showAlert('success', '✅ Attendance Marked Successfully!');
            updateFeedbackMessage(`✅ Success! Marked for ${currentSessionData.class_name} - ${currentSessionData.subject_name}`);
            
            setTimeout(() => {
                cancelAttendance();
            }, 3000);
        } else {
            // Handle different failure cases
            failedAttempts++;
            
            if (result.message.includes('verification failed')) {
                showAlert('danger', '❌ Face verification failed');
                updateFeedbackMessage('Face verification failed - Try again');
                checkForFallback();
                resetBlinkDetection();
                setTimeout(() => startBlinkDetection(), 2000);
            } else if (result.message.includes('already marked')) {
                stopAllCameras();
                showAlert('danger', '⚠️ Attendance already marked');
                setTimeout(() => cancelAttendance(), 2000);
            } else if (result.message.includes('expired')) {
                stopAllCameras();
                showAlert('danger', '🕐 Session expired');
                setTimeout(() => cancelAttendance(), 2000);
            } else {
                showAlert('danger', result.message || 'Failed to mark attendance');
                checkForFallback();
                resetBlinkDetection();
                setTimeout(() => startBlinkDetection(), 2000);
            }
        }
    } catch (error) {
        failedAttempts++;
        showAlert('danger', 'Error: ' + error.message);
        checkForFallback();
        resetBlinkDetection();
        setTimeout(() => startBlinkDetection(), 2000);
    }
}

// DEPRECATED: Manual attendance marking is removed in favor of blink detection
async function markAttendance() {
    // This function is no longer used - attendance is now marked automatically
    // after 3 blinks are detected via captureAndVerifyFace()
    console.warn('markAttendance() is deprecated - use blink detection instead');
}

function cancelAttendance() {
    stopAllCameras();
    stopBlinkDetection();
    resetBlinkDetection();
    
    // Reset failed attempts
    failedAttempts = 0;
    
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