let teacherData = null;
let currentSession = null;
let sessionTimer = null;
let timeRemaining = 60;
let reportData = null;

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
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    const titles = {
        'details': 'My Details',
        'session': 'Start Session',
        'viewData': 'Reports'
    };
    document.getElementById('pageTitle').textContent = titles[section];

    if (section === 'session') loadSessionDropdowns();
    if (section === 'viewData') loadReportDropdowns();
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || user.role !== 'teacher') {
        window.location.href = '/';
        return;
    }
    document.getElementById('userName').textContent = user.name || 'Teacher';
    document.getElementById('userEmail').textContent = user.email || '';
    document.getElementById('userAvatar').textContent = (user.name || 'T')[0].toUpperCase();
}

async function loadTeacherData() {
    try {
        const response = await fetch('/api/teacher/profile', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        teacherData = await response.json();
        
        document.getElementById('teacherName').textContent = teacherData.name;
        document.getElementById('teacherEmail').textContent = teacherData.email;

        const subjectsList = document.getElementById('subjectsList');
        subjectsList.innerHTML = '';
        teacherData.subjects.forEach(subject => {
            subjectsList.innerHTML += `
                <div class="info-item">
                    <div class="info-label">${subject.class_name}</div>
                    <div class="info-value">${subject.subject_name} (${subject.course_code})</div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadSessionDropdowns() {
    try {
        const response = await fetch('/api/teacher/classes-subjects', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await response.json();
        
        const classSelect = document.getElementById('sessionClass');
        classSelect.innerHTML = '<option value="">Choose class...</option>';
        const uniqueClasses = [...new Set(data.map(item => item.class_id))];
        uniqueClasses.forEach(classId => {
            const item = data.find(d => d.class_id === classId);
            classSelect.innerHTML += `<option value="${classId}">${item.class_name}</option>`;
        });

        classSelect.addEventListener('change', function() {
            const subjectSelect = document.getElementById('sessionSubject');
            subjectSelect.innerHTML = '<option value="">Choose subject...</option>';
            data.filter(item => item.class_id == this.value).forEach(item => {
                subjectSelect.innerHTML += `<option value="${item.subject_id}">${item.subject_name} (${item.course_code})</option>`;
            });
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function startSession() {
    const classId = document.getElementById('sessionClass').value;
    const subjectId = document.getElementById('sessionSubject').value;

    if (!classId || !subjectId) {
        alert('Please select both class and subject');
        return;
    }

    try {
        const response = await fetch('/api/teacher/start-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ class_id: classId, subject_id: subjectId })
        });

        currentSession = await response.json();
        
        document.getElementById('startSessionForm').style.display = 'none';
        document.getElementById('activeSession').style.display = 'block';
        document.getElementById('presentStudentsCard').style.display = 'block';
        document.getElementById('sessionCode').textContent = currentSession.code;
        document.getElementById('activeSessionInfo').textContent = 
            `${currentSession.class_name} - ${currentSession.subject_name}`;

        startTimer();
        pollAttendance();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to start session');
    }
}

function startTimer() {
    timeRemaining = 60;
    updateTimerDisplay();
    
    sessionTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            endSession();
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent = `⏱ ${timeRemaining}s remaining`;
}

async function pollAttendance() {
    if (!currentSession) return;

    try {
        const response = await fetch(`/api/teacher/session/${currentSession.id}/attendance`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const students = await response.json();
        
        const list = document.getElementById('presentStudents');
        if (students.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Waiting for students...</p></div>';
        } else {
            list.innerHTML = '';
            students.forEach(student => {
                list.innerHTML += `
                    <div class="student-item">
                        <div class="student-avatar">${student.name[0]}</div>
                        <div class="student-info">
                            <h4>${student.name}</h4>
                            <p>${student.email}</p>
                        </div>
                        <span class="status-badge present">
                            <i class="fas fa-check"></i> Present
                        </span>
                    </div>
                `;
            });
        }

        if (currentSession) {
            setTimeout(pollAttendance, 2000);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function endSession() {
    if (!currentSession) return;

    try {
        await fetch(`/api/teacher/session/${currentSession.id}/end`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });

        clearInterval(sessionTimer);
        currentSession = null;
        
        document.getElementById('startSessionForm').style.display = 'block';
        document.getElementById('activeSession').style.display = 'none';
        document.getElementById('presentStudentsCard').style.display = 'none';
        alert('Session ended successfully');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadReportDropdowns() {
    try {
        const response = await fetch('/api/teacher/classes-subjects', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await response.json();
        
        const classSelect = document.getElementById('reportClass');
        classSelect.innerHTML = '<option value="">Choose class...</option>';
        const uniqueClasses = [...new Set(data.map(item => item.class_id))];
        uniqueClasses.forEach(classId => {
            const item = data.find(d => d.class_id === classId);
            classSelect.innerHTML += `<option value="${classId}">${item.class_name}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadReportSubjects() {
    const classId = document.getElementById('reportClass').value;
    if (!classId) return;

    try {
        const response = await fetch('/api/teacher/classes-subjects', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await response.json();
        
        const subjectSelect = document.getElementById('reportSubject');
        subjectSelect.innerHTML = '<option value="">Choose subject...</option>';
        data.filter(item => item.class_id == classId).forEach(item => {
            subjectSelect.innerHTML += `<option value="${item.subject_id}">${item.subject_name} (${item.course_code})</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadAttendanceReport() {
    const classId = document.getElementById('reportClass').value;
    const subjectId = document.getElementById('reportSubject').value;

    if (!classId || !subjectId) return;

    try {
        const response = await fetch(`/api/teacher/report?class_id=${classId}&subject_id=${subjectId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        reportData = await response.json();
        
        document.getElementById('attendanceReport').style.display = 'block';
        
        let html = '<table><thead><tr><th>Date</th><th>Student</th><th>Status</th></tr></thead><tbody>';
        reportData.records.forEach(record => {
            html += `
                <tr>
                    <td>${new Date(record.date).toLocaleDateString()}</td>
                    <td>${record.student_name}</td>
                    <td>
                        ${record.status === 'present' 
                            ? '<i class="fas fa-check-circle attendance-icon present"></i> Present'
                            : '<i class="fas fa-times-circle attendance-icon absent"></i> Absent'}
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        
        document.getElementById('reportContent').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

function downloadExcel() {
    if (!reportData) return;

    const data = reportData.records.map(record => ({
        'Date': new Date(record.date).toLocaleDateString(),
        'Student Name': record.student_name,
        'Status': record.status === 'present' ? 'Present' : 'Absent'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${Date.now()}.xlsx`);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Initialize
checkAuth();
loadTeacherData();