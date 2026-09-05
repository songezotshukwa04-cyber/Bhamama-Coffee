const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'change-this-to-a-long-random-string'; // move to an env variable before going live

app.use(cors()); // allows your Live Server frontend (different port) to call this API
app.use(express.json());

const db = new Database('users.db');
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// --- Signup ---
app.post('/api/signup', async (req, res) => {
    const { identifier, password } = req.body; // identifier = email OR phone number

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Email/phone and password are required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE identifier = ?').get(identifier);
    if (existing) {
        return res.status(409).json({ error: 'An account with that email/phone already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (identifier, password_hash) VALUES (?, ?)').run(identifier, passwordHash);

    const token = jwt.sign({ identifier }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, identifier });
});

// --- Login ---
app.post('/api/login', async (req, res) => {
    const { identifier, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE identifier = ?').get(identifier);
    if (!user) {
        return res.status(401).json({ error: 'Invalid email/phone or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        return res.status(401).json({ error: 'Invalid email/phone or password.' });
    }

    const token = jwt.sign({ identifier: user.identifier }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, identifier: user.identifier });
});

// --- Verify token (used to check "am I still logged in") ---
app.get('/api/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ identifier: decoded.identifier });
    } catch {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
});

app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));