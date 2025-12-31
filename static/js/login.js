async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorAlert = document.getElementById('errorAlert');
    const btn = document.querySelector('.btn-login');

    errorAlert.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            btn.innerHTML = '<i class="fas fa-check"></i> Success!';
            
            setTimeout(() => {
                switch(data.user.role) {
                    case 'admin':
                        window.location.href = '/admin';
                        break;
                    case 'teacher':
                        window.location.href = '/teacher';
                        break;
                    case 'student':
                        window.location.href = '/student';
                        break;
                }
            }, 500);
        } else {
            errorAlert.textContent = data.message || 'Invalid credentials';
            errorAlert.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<span>Sign In</span>';
        }
    } catch (error) {
        errorAlert.textContent = 'Connection error. Please try again.';
        errorAlert.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<span>Sign In</span>';
    }
}