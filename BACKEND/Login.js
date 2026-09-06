/*
  BACKEND CHANGE NEEDED for showing the customer's name after login
  ---------------------------------------------------------------------
  Your /api/login route needs to SELECT and return `name`, not just
  identifier + token. Signup already does this; login needs to match.
*/

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

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Invalid email/phone or password.' });
        }

        const token = jwt.sign(
            { userId: user.id, identifier: user.identifier },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Include name in the response so the frontend can greet the user by name
        res.json({ token, identifier: user.identifier, name: user.name });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});