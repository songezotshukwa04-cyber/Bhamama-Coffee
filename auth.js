const API_BASE = 'http://localhost:3000';

function saveSession(token, identifier) {
    localStorage.setItem('bhamama_token', token);
    localStorage.setItem('bhamama_identifier', identifier);
}

function clearSession() {
    localStorage.removeItem('bhamama_token');
    localStorage.removeItem('bhamama_identifier');
}

function getToken() {
    return localStorage.getItem('bhamama_token');
}

async function signup(identifier, password) {
    const res = await fetch(`${API_BASE}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed.');
    saveSession(data.token, data.identifier);
    return data;
}

async function login(identifier, password) {
    const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed.');
    saveSession(data.token, data.identifier);
    return data;
}

function logout() {
    clearSession();
    window.location.href = 'index.html';
}

// Runs on every page to update the nav with Login/Signup or Account/Logout
function renderAuthNav() {
    const slot = document.getElementById('auth-nav-item');
    if (!slot) return;

    const identifier = localStorage.getItem('bhamama_identifier');
    if (identifier) {
        const greeting = document.createElement('span');
        greeting.style.cssText = 'color:white; font-size:14px; padding: 0 8px;';
        greeting.textContent = `Hi, ${identifier}`;

        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.style.cssText = 'background:none;border:1px solid white;color:white;padding:6px 12px;border-radius:6px;cursor:pointer;min-height:44px;';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', logout);

        slot.innerHTML = '';
        slot.appendChild(greeting);
        slot.appendChild(logoutBtn);
    } else {
        slot.innerHTML = `<a href="login.html">LOGIN</a> <a href="signup.html">SIGN UP</a>`;
    }
}

document.addEventListener('DOMContentLoaded', renderAuthNav);