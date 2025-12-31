let currentClassId = null;
let allSubjects = [];
let currentTab = 'subjects';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboardData();

    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    menuToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', function() {
        menuToggle.classList.remove('active');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            showSection(this.dataset.section);
            closeSidebar();
        });
    });
});

function closeSidebar() {
    document.getElementById('menuToggle').classList.remove('active');
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
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
        'classes': 'Manage Classes',
        'classManagement': 'Class Management'
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';

    if (section === 'classes') loadClasses();
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
        const [subjects, teachers, students] = await Promise.all([
            fetch(`/api/admin/classes/${currentClassId}/subjects`, {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            }).then(r => r.json()),
            fetch(`/api/admin/classes/${currentClassId}/teachers`, {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            }).then(r => r.json()),
            fetch(`/api/admin/classes/${currentClassId}/students`, {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            }).then(r => r.json())
        ]);

        allSubjects = subjects;
        window.classTeachers = teachers;
        window.classStudents = students;
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
        tabAddBtn.onclick = () => showModal('addSubjectModal');
        renderSubjects(tabContent);
    } else if (currentTab === 'teachers') {
        tabTitle.textContent = 'Teachers';
        tabAddBtn.onclick = () => showAddTeacherModal();
        renderTeachers(tabContent);
    } else if (currentTab === 'students') {
        tabTitle.textContent = 'Students';
        tabAddBtn.onclick = () => showModal('addStudentModal');
        renderStudents(tabContent);
    }
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
        item.innerHTML = `
            <div class="list-item-info">
                <div class="list-item-name">${subject.name}</div>
                <div class="list-item-detail">${subject.code}</div>
            </div>
            <div class="list-actions">
                <button class="list-btn delete" onclick="deleteSubject(${subject.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderTeachers(container) {
    const teachers = window.classTeachers || [];
    if (teachers.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chalkboard-teacher"></i><p>No teachers yet</p></div>';
        return;
    }

    container.innerHTML = '';
    teachers.forEach(teacher => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-info">
                <div class="list-item-name">${teacher.name}</div>
                <div class="list-item-detail">${teacher.email}</div>
            </div>
            <div class="list-actions">
                <button class="list-btn edit" onclick="openEditTeacherModal(${teacher.teacher_id}, '${teacher.name}', '${teacher.email}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="list-btn delete" onclick="deleteTeacher(${teacher.teacher_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
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

async function addSubject(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch(`/api/admin/classes/${currentClassId}/subjects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                name: formData.get('subjectName'),
                code: formData.get('courseCode')
            })
        });
        if (response.ok) {
            closeModal('addSubjectModal');
            await loadClassData();
            loadDashboardData();
            e.target.reset();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to add subject');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteSubject(id) {
    if (!confirm('Delete this subject?')) return;
    try {
        await fetch(`/api/admin/subjects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        await loadClassData();
        loadDashboardData();
    } catch (error) {
        console.error('Error:', error);
    }
}

function showAddTeacherModal() {
    const select = document.getElementById('teacherSubjects');
    select.innerHTML = '';
    allSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = `${subject.name} (${subject.code})`;
        select.appendChild(option);
    });
    showModal('addTeacherModal');
}

async function addTeacher(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedSubjects = Array.from(document.getElementById('teacherSubjects').selectedOptions).map(opt => opt.value);
    try {
        const response = await fetch(`/api/admin/classes/${currentClassId}/teachers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password'),
                subjects: selectedSubjects
            })
        });
        if (response.ok) {
            closeModal('addTeacherModal');
            await loadClassData();
            loadDashboardData();
            e.target.reset();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to add teacher');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function openEditTeacherModal(id, name, email) {
    document.getElementById('editTeacherId').value = id;
    document.getElementById('editTeacherName').value = name;
    document.getElementById('editTeacherEmail').value = email;
    document.getElementById('editTeacherPassword').value = '';
    
    const select = document.getElementById('editTeacherSubjects');
    select.innerHTML = '';
    allSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = `${subject.name} (${subject.code})`;
        select.appendChild(option);
    });

    try {
        const response = await fetch(`/api/admin/teachers/${id}/class/${currentClassId}/subjects`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const currentSubjects = await response.json();
        Array.from(select.options).forEach(opt => {
            if (currentSubjects.includes(parseInt(opt.value))) opt.selected = true;
        });
    } catch (e) { console.error(e); }

    showModal('editTeacherModal');
}

async function updateTeacher(e) {
    e.preventDefault();
    const id = document.getElementById('editTeacherId').value;
    const selectedSubjects = Array.from(document.getElementById('editTeacherSubjects').selectedOptions).map(opt => opt.value);
    
    try {
        const response = await fetch(`/api/admin/teachers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                name: document.getElementById('editTeacherName').value,
                email: document.getElementById('editTeacherEmail').value,
                password: document.getElementById('editTeacherPassword').value || null,
                subjects: selectedSubjects,
                class_id: currentClassId
            })
        });
        if (response.ok) {
            closeModal('editTeacherModal');
            await loadClassData();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to update teacher');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteTeacher(id) {
    if (!confirm('Remove this teacher from this class?')) return;
    try {
        await fetch(`/api/admin/teachers/${id}?class_id=${currentClassId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        await loadClassData();
        loadDashboardData();
    } catch (error) {
        console.error('Error:', error);
    }
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