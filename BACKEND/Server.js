require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(cors());
app.use(express.json());

// ---- Auth middleware ----
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.userId;
        req.identifier = payload.identifier;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

// ---- Signup ----
app.post('/api/signup', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Email/phone and password are required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE identifier = ?').get(identifier);
    if (existing) {
        return res.status(409).json({ error: 'An account with that email or phone already exists.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = db.prepare('INSERT INTO users (identifier, password_hash) VALUES (?, ?)').run(identifier, passwordHash);

        const token = jwt.sign({ userId: result.lastInsertRowid, identifier }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, identifier });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Something went wrong creating your account.' });
    }
});

// ---- Login ----
app.post('/api/login', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Email/phone and password are required.' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE identifier = ?').get(identifier);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email/phone or password.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email/phone or password.' });
        }

        const token = jwt.sign({ userId: user.id, identifier: user.identifier }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, identifier: user.identifier });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Something went wrong logging you in.' });
    }
});

// ---- Orders ----
app.post('/api/orders', requireAuth, (req, res) => {
    const { items, total } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must include at least one item.' });
    }
    if (typeof total !== 'number' || total <= 0) {
        return res.status(400).json({ error: 'Order total is invalid.' });
    }

    try {
        const result = db.prepare('INSERT INTO orders (user_id, items, total) VALUES (?, ?, ?)')
            .run(req.userId, JSON.stringify(items), total);

        res.status(201).json({ orderId: result.lastInsertRowid, message: 'Order placed successfully.' });
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ error: 'Something went wrong placing your order.' });
    }
});

app.get('/api/orders', requireAuth, (req, res) => {
    try {
        const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
        const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
        res.json(parsed);
    } catch (err) {
        console.error('Order fetch error:', err);
        res.status(500).json({ error: 'Something went wrong fetching your orders.' });
    }
});

// ---- Health check ----
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Bhamama backend running on http://localhost:${PORT}`);
});
