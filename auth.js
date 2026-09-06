const API_BASE = 'https://bhamama-coffee.onrender.com';

function saveSession(token, identifier, name) {
    localStorage.setItem('bhamama_token', token);
    localStorage.setItem('bhamama_identifier', identifier);
    if (name) {
        localStorage.setItem('bhamama_name', name);
    }
}

function clearSession() {
    localStorage.removeItem('bhamama_token');
    localStorage.removeItem('bhamama_identifier');
    localStorage.removeItem('bhamama_name');
}

function getToken() {
    return localStorage.getItem('bhamama_token');
}

// Shared helper: does the fetch, and turns any failure mode (network down,
// non-JSON response, unexpected server error) into a friendly Error message.
async function authRequest(path, body) {
    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (networkErr) {
        throw new Error('Could not reach the server. Please check your connection and try again.');
    }

    let data;
    try {
        data = await res.json();
    } catch (parseErr) {
        throw new Error('Unexpected response from the server. Please try again shortly.');
    }

    if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
    }

    return data;
}

async function signup(name, identifier, address, password) {
    const data = await authRequest('/api/signup', { name, identifier, address, password });
    saveSession(data.token, data.identifier, data.name);
    return data;
}

async function login(identifier, password) {
    const data = await authRequest('/api/login', { identifier, password });
    saveSession(data.token, data.identifier, data.name);
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
    const name = localStorage.getItem('bhamama_name');

    if (identifier) {
        const greeting = document.createElement('span');
        greeting.style.cssText = 'color:white; font-size:14px; padding: 0 8px;';
        greeting.textContent = `Hi, ${name || identifier}`;

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
