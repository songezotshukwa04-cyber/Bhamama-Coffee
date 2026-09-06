// Shared cart logic, using localStorage so the cart survives page reloads/navigation

// Reuse the same API_BASE that auth.js already defines on this page, so the
// backend URL only ever needs to be changed in one place (auth.js).
// Falls back to the live URL directly if auth.js somehow isn't loaded yet.
const CART_API_BASE = (typeof API_BASE !== 'undefined') ? API_BASE : 'https://bhamama-coffee.onrender.com';

function getCart() {
    const data = localStorage.getItem('bhamama_cart');
    return data ? JSON.parse(data) : [];
}

function saveCart(cart) {
    localStorage.setItem('bhamama_cart', JSON.stringify(cart));
}

function addToCart(name, price) {
    if (!name || isNaN(price)) {
        console.error('addToCart called with invalid data:', { name, price });
        return;
    }
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

// Shows a message inline near the order button/total if a #order-message
// element exists on the page; otherwise falls back to a browser alert.
function showOrderMessage(message, isError) {
    const msgEl = document.getElementById('order-message');
    if (msgEl) {
        msgEl.textContent = message;
        msgEl.style.color = isError ? '#ff8080' : '#8fd18f';
    } else {
        alert(message);
    }
}

function clearOrderMessage() {
    const msgEl = document.getElementById('order-message');
    if (msgEl) msgEl.textContent = '';
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
            const name = btn.dataset.name;
            const price = parseFloat(btn.dataset.price);
            addToCart(name, price);
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

    // Wire up the Place Order button here so we can manage its
    // loading/disabled state in one place.
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }

    // Pre-fill delivery address from the account's saved address, if we have one
    const savedAddress = localStorage.getItem('bhamama_address');
    const addressInput = document.getElementById('delivery-address');
    if (savedAddress && addressInput && !addressInput.value) {
        addressInput.value = savedAddress;
    }
});

async function placeOrder() {
    clearOrderMessage();

    const token = localStorage.getItem('bhamama_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        showOrderMessage('Your cart is empty.', true);
        return;
    }

    const addressInput = document.getElementById('delivery-address');
    const deliveryAddress = addressInput ? addressInput.value.trim() : '';
    if (!deliveryAddress) {
        showOrderMessage('Please enter a delivery address.', true);
        if (addressInput) addressInput.focus();
        return;
    }

    const paymentInput = document.querySelector('input[name="payment-method"]:checked');
    const paymentMethod = paymentInput ? paymentInput.value : null;
    if (!paymentMethod) {
        showOrderMessage('Please select a payment method.', true);
        return;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const placeOrderBtn = document.getElementById('place-order-btn');
    const originalBtnText = placeOrderBtn ? placeOrderBtn.textContent : null;
    if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'PLACING ORDER...';
    }

    let res;
    try {
        res = await fetch(`${CART_API_BASE}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items: cart, total, deliveryAddress, paymentMethod })
        });
    } catch (networkErr) {
        showOrderMessage('Could not reach the server. Please check your connection and try again.', true);
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = originalBtnText;
        }
        return;
    }

    let data;
    try {
        data = await res.json();
    } catch (parseErr) {
        showOrderMessage('Unexpected response from the server. Please try again shortly.', true);
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = originalBtnText;
        }
        return;
    }

    if (res.ok) {
        localStorage.removeItem('bhamama_cart');
        localStorage.setItem('bhamama_address', deliveryAddress);
        renderCart();
        showOrderMessage('Order placed! Thank you.', false);
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = originalBtnText;
        }
    } else {
        showOrderMessage(data.error || 'Something went wrong placing your order.', true);
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = originalBtnText;
        }
    }
}
