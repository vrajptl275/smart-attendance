let currentClassId = null;
let allSubjects = [];
let allTeachers = [];
let currentTab = 'subjects';

console.log('admin.js loaded');

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

function init() {
    console.log('init called');
    checkAuth();
    loadDashboardData();
    setupMenuToggle();
    setupNavigation();
    console.log('init complete');
}

function setupMenuToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (!menuToggle || !sidebar || !overlay) {
        console.error('Menu elements not found!');
        return;
    }

    // Use addEventListener with capture to ensure we catch the click
    menuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Menu clicked');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        this.classList.toggle('active');
    }, true);

    overlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        menuToggle.classList.remove('active');
    });
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = function() {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            showSection(this.dataset.section);
            closeSidebar();
        };
    });
}

function closeSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    menuToggle.classList.remove('active');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || user.role !== 'admin') {
        window.location.href = '/';
    }
    const initial = (user.name || 'A')[0].toUpperCase();
    document.getElementById('adminAvatar').textContent = initial;
    document.getElementById('adminName').textContent = user.name || 'Admin';
}

function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    const titles = {
        'dashboard': 'Dashboard',
        'teachers': 'Manage Teachers', // NEW: Teachers section
        'classes': 'Manage Classes',
        'classManagement': 'Class Management'
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';

    if (section === 'classes') loadClasses();
    if (section === 'teachers') loadTeachers(); // NEW: Load teachers
}

async function loadDashboardData() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await response.json();
        document.getElementById('totalClasses').textContent = data.classes || 0;
        document.getElementById('totalStudents').textContent = data.students || 0;
        document.getElementById('totalTeachers').textContent = data.teachers || 0;
        document.getElementById('totalSubjects').textContent = data.subjects || 0;
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// TEACHER MANAGEMENT (STANDALONE)
// ============================================

async function loadTeachers() {
    try {
        const response = await fetch('/api/admin/teachers', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const teachers = await response.json();
        allTeachers = teachers; // Store for later use
        renderTeachersList(teachers);
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
}

function renderTeachersList(teachers) {
    const container = document.getElementById('teachersContainer');
    
    if (teachers.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chalkboard-teacher"></i><p>No teachers yet. Add your first teacher!</p></div>';
        return;
    }

    container.innerHTML = '';
    teachers.forEach(teacher => {
        const card = document.createElement('div');
        card.className = 'teacher-card';
        card.innerHTML = `
            <div class="teacher-content">
                <div class="teacher-avatar">${teacher.name[0].toUpperCase()}</div>
                <div class="teacher-info">
                    <div class="teacher-name">${teacher.name}</div>
                    <div class="teacher-email">${teacher.email}</div>
                </div>
                <div class="teacher-actions">
                    <button class="action-icon" onclick="openEditTeacherStandaloneModal(${teacher.teacher_id}, '${teacher.name}', '${teacher.email}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon" onclick="deleteTeacherStandalone(${teacher.teacher_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function addTeacherStandalone(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/admin/teachers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeModal('addTeacherStandaloneModal');
            loadTeachers();
            loadDashboardData();
            e.target.reset();
        } else {
            alert(result.message || 'Failed to add teacher');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding teacher');
    }
}

function openEditTeacherStandaloneModal(teacherId, name, email) {
    document.getElementById('editTeacherStandaloneId').value = teacherId;
    document.getElementById('editTeacherStandaloneName').value = name;
    document.getElementById('editTeacherStandaloneEmail').value = email;
    document.getElementById('editTeacherStandalonePassword').value = '';
    showModal('editTeacherStandaloneModal');
}

async function updateTeacherStandalone(e) {
    e.preventDefault();
    const teacherId = document.getElementById('editTeacherStandaloneId').value;
    const name = document.getElementById('editTeacherStandaloneName').value;
    const email = document.getElementById('editTeacherStandaloneEmail').value;
    const password = document.getElementById('editTeacherStandalonePassword').value;
    
    try {
        const response = await fetch(`/api/admin/teachers/${teacherId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password || null
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeModal('editTeacherStandaloneModal');
            loadTeachers();
        } else {
            alert(result.message || 'Failed to update teacher');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating teacher');
    }
}

async function deleteTeacherStandalone(teacherId) {
    if (!confirm('Delete this teacher? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/admin/teachers/${teacherId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            loadTeachers();
            loadDashboardData();
        } else {
            // Show detailed error message if teacher has assignments
            if (result.subjects) {
                alert(`${result.message}\n\n${result.subjects.join('\n')}`);
            } else {
                alert(result.message || 'Failed to delete teacher');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting teacher');
    }
}

async function loadClasses() {
    try {
        const response = await fetch('/api/admin/classes', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const classes = await response.json();
        const grid = document.getElementById('classGrid');
        
        if (classes.length === 0) {
            grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-school"></i><p>No classes yet. Add your first class!</p></div>';
            return;
        }

        grid.innerHTML = '';
        classes.forEach(cls => {
            const card = document.createElement('div');
            card.className = 'class-card';
            card.innerHTML = `
                <div class="class-content">
                    <div class="class-emoji">🎓</div>
                    <div class="class-name">${cls.name}</div>
                    <div class="class-info">
                        <i class="fas fa-users"></i>
                        ${cls.student_count || 0} Students
                    </div>
                    <div class="class-actions">
                        <button class="action-icon" onclick="event.stopPropagation(); openClassManagement(${cls.id}, '${cls.name}')">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="action-icon" onclick="event.stopPropagation(); openEditClassModal(${cls.id}, '${cls.name}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-icon" onclick="event.stopPropagation(); deleteClass(${cls.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            card.onclick = () => openClassManagement(cls.id, cls.name);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

function showModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function openEditClassModal(id, name) {
    document.getElementById('editClassId').value = id;
    document.getElementById('editClassName').value = name;
    showModal('editClassModal');
}

async function addClass(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/api/admin/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ name: formData.get('className') })
        });
        if (response.ok) {
            closeModal('addClassModal');
            loadClasses();
            loadDashboardData();
            e.target.reset();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to add class');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateClass(e) {
    e.preventDefault();
    const id = document.getElementById('editClassId').value;
    const name = document.getElementById('editClassName').value;
    try {
        const response = await fetch(`/api/admin/classes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ name })
        });
        if (response.ok) {
            closeModal('editClassModal');
            loadClasses();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteClass(id) {
    if (!confirm('Delete this class? All data will be removed.')) return;
    try {
        const response = await fetch(`/api/admin/classes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        if (response.ok) {
            loadClasses();
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function openClassManagement(classId, className) {
    currentClassId = classId;
    document.getElementById('currentClassName').textContent = className;
    showSection('classManagement');
    currentTab = 'subjects';
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-tab="subjects"]').classList.add('active');
    await loadClassData();
}

function backToClasses() {
    showSection('classes');
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
    loadTabContent();
}

async function loadClassData() {
    try {
        // Load subjects with teacher assignments and all available teachers
        const subjectsResponse = await fetch(`/api/admin/classes/${currentClassId}/subjects`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const subjectsData = await subjectsResponse.json();
        
        allSubjects = subjectsData.subjects || [];
        allTeachers = subjectsData.teachers || [];
        
        // Load students
        const studentsResponse = await fetch(`/api/admin/classes/${currentClassId}/students`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        window.classStudents = await studentsResponse.json();
        
        loadTabContent();
    } catch (error) {
        console.error('Error:', error);
    }
}

function loadTabContent() {
    const tabTitle = document.getElementById('tabTitle');
    const tabAddBtn = document.getElementById('tabAddBtn');
    const tabContent = document.getElementById('tabContent');

    if (currentTab === 'subjects') {
        tabTitle.textContent = 'Subjects';
        tabAddBtn.onclick = () => showAddSubjectModal();
        renderSubjects(tabContent);
    } else if (currentTab === 'students') {
        tabTitle.textContent = 'Students';
        tabAddBtn.onclick = () => showModal('addStudentModal');
        renderStudents(tabContent);
    }
    // NOTE: Teachers tab is removed from class management
}

function renderSubjects(container) {
    if (allSubjects.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-book"></i><p>No subjects yet</p></div>';
        return;
    }

    container.innerHTML = '';
    allSubjects.forEach(subject => {
        const item = document.createElement('div');
        item.className = 'list-item';
        const teacherInfo = subject.teacher_name ? 
            `${subject.teacher_name} (${subject.teacher_email})` : 
            'No teacher assigned';
        
        item.innerHTML = `
            <div class="list-item-info">
                <div class="list-item-name">${subject.name}</div>
                <div class="list-item-detail">${subject.code}</div>
                <div class="list-item-teacher">👨‍🏫 ${teacherInfo}</div>
            </div>
            <div class="list-actions">
                <button class="list-btn edit" onclick="openEditSubjectModal(${subject.id}, '${subject.name}', '${subject.code}', ${subject.teacher_id || 'null'})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="list-btn delete" onclick="deleteSubject(${subject.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderTeachers(container) {
    // DEPRECATED: Teachers are no longer managed within class management
    // This function is kept for compatibility but should not be called
    container.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>Teachers are now managed from the main Teachers menu</p></div>';
}

function renderStudents(container) {
    const students = window.classStudents || [];
    if (students.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-user-graduate"></i><p>No students yet</p></div>';
        return;
    }

    container.innerHTML = '';
    students.forEach(student => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <div class="list-item-name">${student.name}</div>
                <div class="list-item-detail">${student.email}</div>
            </div>
            <div class="list-actions">
                <button class="list-btn edit" onclick="openEditStudentModal(${student.student_id}, '${student.name}', '${student.email}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="list-btn delete" onclick="deleteStudent(${student.student_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

// ============================================
// SUBJECT MANAGEMENT WITH TEACHER ASSIGNMENT
// ============================================

function showAddSubjectModal() {
    // Populate teacher dropdown
    const teacherSelect = document.getElementById('subjectTeacher');
    teacherSelect.innerHTML = '<option value="">Select a teacher...</option>';
    
    allTeachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.teacher_id;
        option.textContent = `${teacher.name} (${teacher.email})`;
        teacherSelect.appendChild(option);
    });
    
    showModal('addSubjectModal');
}

async function addSubject(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const teacherId = formData.get('teacher_id');
    
    if (!teacherId) {
        alert('Please select a teacher for this subject');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/classes/${currentClassId}/subjects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                name: formData.get('subjectName'),
                code: formData.get('courseCode'),
                teacher_id: parseInt(teacherId)
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeModal('addSubjectModal');
            await loadClassData();
            loadDashboardData();
            e.target.reset();
        } else {
            alert(result.message || 'Failed to add subject');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding subject');
    }
}

function openEditSubjectModal(subjectId, name, code, teacherId) {
    document.getElementById('editSubjectId').value = subjectId;
    document.getElementById('editSubjectName').value = name;
    document.getElementById('editSubjectCode').value = code;
    
    // Populate teacher dropdown
    const teacherSelect = document.getElementById('editSubjectTeacher');
    teacherSelect.innerHTML = '<option value="">Select a teacher...</option>';
    
    allTeachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.teacher_id;
        option.textContent = `${teacher.name} (${teacher.email})`;
        if (teacher.teacher_id === teacherId) {
            option.selected = true;
        }
        teacherSelect.appendChild(option);
    });
    
    showModal('editSubjectModal');
}

async function updateSubject(e) {
    e.preventDefault();
    const subjectId = document.getElementById('editSubjectId').value;
    const name = document.getElementById('editSubjectName').value;
    const code = document.getElementById('editSubjectCode').value;
    const teacherId = document.getElementById('editSubjectTeacher').value;
    
    if (!teacherId) {
        alert('Please select a teacher for this subject');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/subjects/${subjectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                name: name,
                code: code,
                teacher_id: parseInt(teacherId),
                class_id: currentClassId
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeModal('editSubjectModal');
            await loadClassData();
        } else {
            alert(result.message || 'Failed to update subject');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating subject');
    }
}

async function deleteSubject(id) {
    if (!confirm('Delete this subject? This will also remove the teacher assignment.')) return;
    
    try {
        const response = await fetch(`/api/admin/subjects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        
        if (response.ok) {
            await loadClassData();
            loadDashboardData();
        } else {
            const result = await response.json();
            alert(result.message || 'Failed to delete subject');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting subject');
    }
}

// ============================================
// DEPRECATED TEACHER FUNCTIONS (CLASS-BASED)
// These functions are deprecated in favor of standalone teacher management
// ============================================

function showAddTeacherModal() {
    // DEPRECATED: Teachers are now managed independently
    alert('Teachers are now managed from the main Teachers menu. Please use the Teachers section in the sidebar.');
}

async function addTeacher(e) {
    // DEPRECATED: Use addTeacherStandalone instead
    e.preventDefault();
    alert('Teachers are now managed from the main Teachers menu.');
}

async function openEditTeacherModal(id, name, email) {
    // DEPRECATED: Use openEditTeacherStandaloneModal instead
    alert('Teachers are now managed from the main Teachers menu.');
}

async function updateTeacher(e) {
    // DEPRECATED: Use updateTeacherStandalone instead
    e.preventDefault();
    alert('Teachers are now managed from the main Teachers menu.');
}

async function deleteTeacher(id) {
    // DEPRECATED: Use deleteTeacherStandalone instead
    alert('Teachers are now managed from the main Teachers menu.');
}

async function addStudent(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch(`/api/admin/classes/${currentClassId}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        if (response.ok) {
            closeModal('addStudentModal');
            await loadClassData();
            loadDashboardData();
            e.target.reset();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to add student');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function openEditStudentModal(id, name, email) {
    document.getElementById('editStudentId').value = id;
    document.getElementById('editStudentName').value = name;
    document.getElementById('editStudentEmail').value = email;
    document.getElementById('editStudentPassword').value = '';
    
    const classSelect = document.getElementById('editStudentClass');
    classSelect.innerHTML = '<option value="">Loading...</option>';
    
    try {
        const response = await fetch('/api/admin/classes', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const classes = await response.json();
        
        classSelect.innerHTML = '<option value="">Don\'t Transfer (Keep Current)</option>';
        classes.forEach(c => {
            classSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    } catch (error) {
        console.error('Error loading classes:', error);
    }

    showModal('editStudentModal');
}

async function updateStudent(e) {
    e.preventDefault();
    const id = document.getElementById('editStudentId').value;
    const classId = document.getElementById('editStudentClass').value;
    
    const body = {
        name: document.getElementById('editStudentName').value,
        email: document.getElementById('editStudentEmail').value,
        password: document.getElementById('editStudentPassword').value || null
    };

    if (classId) {
        body.class_id = classId;
    }

    try {
        const response = await fetch(`/api/admin/students/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            closeModal('editStudentModal');
            await loadClassData();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to update student');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteStudent(id) {
    if (!confirm('Delete this student?')) return;
    try {
        const response = await fetch(`/api/admin/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        if (response.ok) {
            await loadClassData();
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}