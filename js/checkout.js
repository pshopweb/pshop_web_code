/* checkout.js */
// ============================================
// PShop - Checkout Page
// ============================================

let currentStep = 1;
let shippingData = {};
let paymentData = {};

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireAuth();
    loadCheckoutSummary();
    initCheckout();
});

function loadCheckoutSummary() {
    const cart = JSON.parse(localStorage.getItem('pshop_cart') || '[]');
    const summary = JSON.parse(localStorage.getItem('pshop_order_summary') || '{}');

    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    // Render items
    const checkoutItems = document.getElementById('checkoutItems');
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <img src="${item.image || 'assets/images/default-product.png'}" alt="" onerror="this.src='assets/images/default-product.png'">
            <div class="checkout-item-info">
                <h4>${Utils.truncate(item.name, 30)}</h4>
                <p>Qty: ${item.quantity}</p>
            </div>
            <div class="checkout-item-price">${Utils.formatPrice(item.price * item.quantity)}</div>
        </div>
    `).join('');

    document.getElementById('checkoutSubtotal').textContent = Utils.formatPrice(summary.subtotal || 0);
    document.getElementById('checkoutShipping').textContent = summary.shipping === 0 ? 'Free' : Utils.formatPrice(summary.shipping || 0);
    document.getElementById('checkoutTax').textContent = Utils.formatPrice(summary.tax || 0);
    document.getElementById('checkoutTotal').textContent = Utils.formatPrice(summary.total || 0);

    // Pre-fill from user data
    const user = Auth.getUser();
    if (user) {
        const firstName = user.name ? user.name.split(' ')[0] : '';
        const lastName = user.name ? user.name.split(' ').slice(1).join(' ') : '';
        document.getElementById('shipFirstName').value = firstName;
        document.getElementById('shipLastName').value = lastName;
        document.getElementById('shipEmail').value = user.email || '';
        document.getElementById('shipPhone').value = user.phone || '';
    }
}

function initCheckout() {
    // Shipping form
    document.getElementById('shippingForm').addEventListener('submit', (e) => {
        e.preventDefault();
        shippingData = {
            firstName: document.getElementById('shipFirstName').value,
            lastName: document.getElementById('shipLastName').value,
            email: document.getElementById('shipEmail').value,
            phone: document.getElementById('shipPhone').value,
            address: document.getElementById('shipAddress').value,
            city: document.getElementById('shipCity').value,
            state: document.getElementById('shipState').value,
            zip: document.getElementById('shipZip').value,
            country: document.getElementById('shipCountry').value
        };
        goToStep(2);
    });

    // Payment form
    document.getElementById('paymentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const method = document.querySelector('input[name="paymentMethod"]:checked').value;
        paymentData = { method };

        if (method === 'card') {
            paymentData.cardNumber = document.getElementById('cardNumber').value;
            paymentData.cardName = document.getElementById('cardName').value;
        }

        updateOrderReview();
        goToStep(3);
    });

    // Payment method toggle
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('active'));
            radio.closest('.payment-option').classList.add('active');

            document.getElementById('cardDetails').style.display =
                radio.value === 'card' ? 'block' : 'none';
        });
    });

    // Navigation buttons
    document.getElementById('backToShipping').addEventListener('click', () => goToStep(1));
    document.getElementById('backToPayment').addEventListener('click', () => goToStep(2));

    // Place order
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
}

function goToStep(step) {
    currentStep = step;

    document.querySelectorAll('.checkout-step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');

    document.querySelectorAll('.step').forEach(el => {
        const stepNum = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (stepNum === step) el.classList.add('active');
        else if (stepNum < step) el.classList.add('completed');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateOrderReview() {
    document.getElementById('reviewAddress').innerHTML = `
        ${shippingData.firstName} ${shippingData.lastName}<br>
        ${shippingData.address}<br>
        ${shippingData.city}, ${shippingData.state} ${shippingData.zip}<br>
        ${shippingData.country}<br>
        Phone: ${shippingData.phone}
    `;

    const methodNames = { card: 'Credit/Debit Card', cod: 'Cash on Delivery' };
    let paymentText = methodNames[paymentData.method] || paymentData.method;
    if (paymentData.method === 'card' && paymentData.cardNumber) {
        paymentText += ` ending in ${paymentData.cardNumber.slice(-4)}`;
    }
    document.getElementById('reviewPayment').textContent = paymentText;

    const cart = JSON.parse(localStorage.getItem('pshop_cart') || '[]');
    document.getElementById('reviewItems').innerHTML = cart.map(item => `
        <div class="checkout-item">
            <img src="${item.image || 'assets/images/default-product.png'}" alt="" onerror="this.src='assets/images/default-product.png'">
            <div class="checkout-item-info">
                <h4>${Utils.truncate(item.name, 30)}</h4>
                <p>Qty: ${item.quantity}</p>
            </div>
            <div class="checkout-item-price">${Utils.formatPrice(item.price * item.quantity)}</div>
        </div>
    `).join('');
}

async function placeOrder() {
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    const user = Auth.getUser();
    const cart = JSON.parse(localStorage.getItem('pshop_cart') || '[]');
    const summary = JSON.parse(localStorage.getItem('pshop_order_summary') || '{}');

    const orderData = {
        userId: user?.id || 'guest',
        orderId: Utils.generateOrderId(),
        items: cart,
        shipping: shippingData,
        payment: paymentData,
        subtotal: summary.subtotal,
        shipping_cost: summary.shipping,
        tax: summary.tax,
        total: summary.total,
        date: new Date().toISOString(),
        status: 'pending'
    };

    try {
        await ApiService.placeOrder(orderData);
    } catch (e) {
        // Continue with success anyway for demo
    }

    // Show success
    document.getElementById('orderId').textContent = orderData.orderId;
    document.getElementById('successModal').classList.add('show');

    // Save order locally
    let orders = JSON.parse(localStorage.getItem('pshop_orders') || '[]');
    orders.unshift(orderData);
    localStorage.setItem('pshop_orders', JSON.stringify(orders));

    // Clear cart
    localStorage.removeItem('pshop_cart');
    localStorage.removeItem('pshop_order_summary');
    Auth.updateCartCount();

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
}