/* cart.js */
// ============================================
// PShop - Cart Page
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    renderCart();
});

function renderCart() {
    const cart = JSON.parse(localStorage.getItem('pshop_cart') || '[]');
    const emptyCart = document.getElementById('emptyCart');
    const cartContent = document.getElementById('cartContent');
    const cartItems = document.getElementById('cartItems');

    if (cart.length === 0) {
        emptyCart.style.display = 'block';
        cartContent.style.display = 'none';
        return;
    }

    emptyCart.style.display = 'none';
    cartContent.style.display = 'grid';

    document.getElementById('cartSummary').textContent = `${cart.reduce((s, i) => s + i.quantity, 0)} items in your cart`;

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">
                <img src="${item.image || 'assets/images/default-product.png'}" alt="${Utils.htmlEscape(item.name)}" onerror="this.src='assets/images/default-product.png'">
            </div>
            <div class="cart-item-info">
                <h3>${Utils.htmlEscape(item.name)}</h3>
                <p>Price: ${Utils.formatPrice(item.price)}</p>
                <div class="cart-item-price">${Utils.formatPrice(item.price * item.quantity)}</div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <input type="number" value="${item.quantity}" min="1" onchange="setQuantity('${item.id}', this.value)">
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `).join('');

    updateSummary(cart);
}

function updateQuantity(id, delta) {
    let cart = JSON.parse(localStorage.getItem('pshop_cart') || '[]');
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.quantity = Math.max(1, Math.min(99, item.quantity + delta));
    localStorage.setItem('pshop_cart', JSON.stringify(cart));
    renderCart();
    Auth.updateCartCount();
}

function setQuantity(id, value) {
    let cart = JSON.parse(localStorage.getItem('pshop_cart') || '[]');
    const item = cart.find(i => i.id === id);
    if (!item) return;

    let qty = parseInt(value);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > 99) qty = 99;

    item.quantity = qty;
    localStorage.setItem('pshop_cart', JSON.stringify(cart));
    renderCart();
    Auth.updateCartCount();
}

function removeFromCart(id) {
    let cart = JSON.parse(localStorage.getItem('pshop_cart') || '[]');
    cart = cart.filter(i => i.id !== id);
    localStorage.setItem('pshop_cart', JSON.stringify(cart));
    renderCart();
    Auth.updateCartCount();
    Utils.showToast('Item removed from cart', 'info');
}

function updateSummary(cart) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal >= APP_CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : APP_CONFIG.SHIPPING_COST;
    const tax = subtotal * APP_CONFIG.TAX_RATE;
    const total = subtotal + shipping + tax;

    document.getElementById('subtotal').textContent = Utils.formatPrice(subtotal);
    document.getElementById('shipping').textContent = shipping === 0 ? 'Free' : Utils.formatPrice(shipping);
    document.getElementById('tax').textContent = Utils.formatPrice(tax);
    document.getElementById('total').textContent = Utils.formatPrice(total);

    // Store for checkout
    localStorage.setItem('pshop_order_summary', JSON.stringify({ subtotal, shipping, tax, total }));
}

// Promo code (placeholder)
const applyPromo = document.getElementById('applyPromo');
if (applyPromo) {
    applyPromo.addEventListener('click', () => {
        const code = document.getElementById('promoInput').value.trim();
        if (code) {
            Utils.showToast('Invalid promo code', 'error');
        } else {
            Utils.showToast('Please enter a promo code', 'info');
        }
    });
}