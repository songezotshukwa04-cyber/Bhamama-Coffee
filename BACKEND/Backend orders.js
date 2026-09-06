/*
  BACKEND CHANGES NEEDED for delivery address + payment method on orders
  ------------------------------------------------------------------------
  1. Add delivery_address and payment_method columns to your orders table
  2. Accept and store them in the /api/orders route
*/

// 1. Table setup
// If your orders table already exists, run this once:
//   ALTER TABLE orders ADD COLUMN delivery_address TEXT;
//   ALTER TABLE orders ADD COLUMN payment_method TEXT;
//
// If creating fresh:
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    delivery_address TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// 2. Updated /api/orders route
// Assumes you already have JWT auth middleware that sets req.user (with userId)
app.post('/api/orders', authenticateToken, (req, res) => {
    const { items, total, deliveryAddress, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Your cart is empty.' });
    }
    if (typeof total !== 'number' || total <= 0) {
        return res.status(400).json({ error: 'Invalid order total.' });
    }
    if (!deliveryAddress || !deliveryAddress.trim()) {
        return res.status(400).json({ error: 'Delivery address is required.' });
    }
    if (!paymentMethod || !['cash', 'card'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Please select a valid payment method.' });
    }

    try {
        const result = db.prepare(
            `INSERT INTO orders (user_id, items, total, delivery_address, payment_method)
             VALUES (?, ?, ?, ?, ?)`
        ).run(
            req.user.userId,
            JSON.stringify(items),
            total,
            deliveryAddress.trim(),
            paymentMethod
        );

        res.status(201).json({
            orderId: result.lastInsertRowid,
            message: 'Order placed successfully.'
        });
    } catch (err) {
        console.error('Order error:', err);
        res.status(500).json({ error: 'Something went wrong placing your order.' });
    }
});