/*
  BACKEND CHANGES NEEDED (merge into your existing server.js)
  ------------------------------------------------------------
  1. Add a `name` column to your users table (if not already there)
  2. Accept `name` in the /api/signup route
  3. Store it alongside identifier + hashed password
*/

// 1. Table setup (only needed once — if you're using a fresh DB or migrations)
// If your users table already exists without a name column, run this once:
//   ALTER TABLE users ADD COLUMN name TEXT;
//
// If creating fresh:
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    identifier TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 2 & 3. Updated /api/signup route
app.post('/api/signup', async (req, res) => {
    const { name, identifier, password } = req.body;

    if (!name || !identifier || !password) {
        return res.status(400).json({ error: 'Name, email/phone, and password are required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    try {
        const existing = db.prepare('SELECT id FROM users WHERE identifier = ?').get(identifier);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email/phone already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = db.prepare(
            'INSERT INTO users (name, identifier, password_hash) VALUES (?, ?, ?)'
        ).run(name.trim(), identifier, passwordHash);

        const token = jwt.sign(
            { userId: result.lastInsertRowid, identifier },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ token, identifier, name: name.trim() });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});