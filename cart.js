// Shared cart logic, using localStorage so the cart survives page reloads/navigation
function getCart() {
    const data = localStorage.getItem('bhamama_cart');
    return data ? JSON.parse(data) : [];
}

function saveCart(cart) {
    localStorage.setItem('bhamama_cart', JSON.stringify(cart));
}

function addToCart(name, price) {
    const cart = getCart();
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ name, price, qty: 1 });
    }
    saveCart(cart);
    renderCart();
    announce(`${name} added to cart`);
}

function removeFromCart(name) {
    let cart = getCart();
    cart = cart.filter(item => item.name !== name);
    saveCart(cart);
    renderCart();
    announce(`${name} removed from cart`);
}

function changeQty(name, delta) {
    const cart = getCart();
    const item = cart.find(i => i.name === name);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(name);
        return;
    }
    saveCart(cart);
    renderCart();
}

function announce(message) {
    const liveRegion = document.getElementById('cart-announcer');
    if (liveRegion) liveRegion.textContent = message;
}

function renderCart() {
    const cart = getCart();
    const countEl = document.getElementById('cart-count');
    const listEl = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const toggleBtn = document.getElementById('cart-toggle');

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    if (countEl) countEl.textContent = totalItems;
    if (toggleBtn) toggleBtn.setAttribute('aria-label', `View cart, ${totalItems} items`);

    if (listEl) {
        listEl.innerHTML = '';
        if (cart.length === 0) {
            listEl.innerHTML = '<li>Your cart is empty.</li>';
        } else {
            cart.forEach(item => {
                const li = document.createElement('li');
                li.className = 'cart-line';
                li.innerHTML = `
                    <span class="cart-line-name">${item.name}</span>
                    <span class="cart-line-controls">
                        <button aria-label="Decrease ${item.name} quantity" data-action="decrease" data-name="${item.name}">−</button>
                        <span aria-label="${item.qty} in cart">${item.qty}</span>
                        <button aria-label="Increase ${item.name} quantity" data-action="increase" data-name="${item.name}">+</button>
                    </span>
                    <span class="cart-line-price">R${(item.price * item.qty).toFixed(2)}</span>
                    <button aria-label="Remove ${item.name} from cart" data-action="remove" data-name="${item.name}">×</button>
                `;
                listEl.appendChild(li);
            });
        }
    }

    if (totalEl) {
        const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        totalEl.textContent = `Total: R${total.toFixed(2)}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderCart();

    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            addToCart(btn.dataset.name, parseFloat(btn.dataset.price));
        });
    });

    const toggleBtn = document.getElementById('cart-toggle');
    const panel = document.getElementById('cart-panel');
    const closeBtn = document.getElementById('cart-close');

    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', () => {
            panel.classList.add('open');
            panel.setAttribute('aria-hidden', 'false');
            closeBtn.focus();
        });
    }
    if (closeBtn && panel) {
        closeBtn.addEventListener('click', () => {
            panel.classList.remove('open');
            panel.setAttribute('aria-hidden', 'true');
            toggleBtn.focus();
        });
    }

    if (panel) {
        panel.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const name = e.target.dataset.name;
            if (action === 'increase') changeQty(name, 1);
            if (action === 'decrease') changeQty(name, -1);
            if (action === 'remove') removeFromCart(name);
        });
    }

    // Close cart on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel && panel.classList.contains('open')) {
            panel.classList.remove('open');
            panel.setAttribute('aria-hidden', 'true');
            toggleBtn.focus();
        }
    });
});

async function placeOrder() {
    const token = localStorage.getItem('bhamama_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const res = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: cart, total })
    });

    if (res.ok) {
        localStorage.removeItem('bhamama_cart');
        renderCart();
        alert('Order placed! Thank you.');
    } else {
        const data = await res.json();
        alert(data.error || 'Something went wrong placing your order.');
    }
}