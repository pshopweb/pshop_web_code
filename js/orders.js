/* orders.js */
// ============================================
// PShop - Orders Page
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireAuth();
    loadOrders();
    initOrderFilters();
});

async function loadOrders(statusFilter = 'all') {
    const ordersList = document.getElementById('ordersList');
    const emptyOrders = document.getElementById('emptyOrders');
    const spinner = document.getElementById('loadingSpinner');

    spinner.style.display = 'block';

    let orders = [];

    // Try API first
    try {
        const user = Auth.getUser();
        const response = await ApiService.getOrders(user?.id);
        if (response && response.orders) {
            orders = response.orders;
        }
    } catch (e) {
        // Fall back to local
    }

    // Use local orders
    const localOrders = JSON.parse(localStorage.getItem('pshop_orders') || '[]');
    orders = orders.length > 0 ? orders : localOrders;

    // Filter
    if (statusFilter !== 'all') {
        orders = orders.filter(o => o.status === statusFilter);
    }

    spinner.style.display = 'none';

    if (orders.length === 0) {
        emptyOrders.style.display = 'block';
        ordersList.style.display = 'none';
        return;
    }

    emptyOrders.style.display = 'none';
    ordersList.style.display = 'flex';

    ordersList.innerHTML = orders.map(order => `
        <div class="order-card" onclick="showOrderDetail('${order.orderId}')">
            <div class="order-header">
                <div>
                    <h3>Order ${order.orderId}</h3>
                    <span class="order-date">${Utils.formatDate(order.date)}</span>
                </div>
                <span class="order-status status-${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
            </div>
            <div class="order-items">
                ${(order.items || []).slice(0, 3).map(item => `
                    <div class="order-item">
                        <img src="${item.image || 'assets/images/default-product.png'}" alt="" onerror="this.src='assets/images/default-product.png'">
                        <div class="order-item-info">
                            <h4>${Utils.truncate(item.name, 25)}</h4>
                            <p>Qty: ${item.quantity}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="order-footer">
                <span>Total: ${Utils.formatPrice(order.total)}</span>
                <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); showOrderDetail('${order.orderId}')">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

function initOrderFilters() {
    document.querySelectorAll('.order-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.order-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadOrders(btn.dataset.status);
        });
    });
}

function showOrderDetail(orderId) {
    const localOrders = JSON.parse(localStorage.getItem('pshop_orders') || '[]');
    const order = localOrders.find(o => o.orderId === orderId);

    if (!order) {
        Utils.showToast('Order not found', 'error');
        return;
    }

    const content = document.getElementById('orderDetailContent');
    content.innerHTML = `
        <div class="order-detail-info">
            <div class="info-row" style="margin-bottom:16px;">
                <div class="info-item">
                    <label>Order ID</label>
                    <p>${order.orderId}</p>
                </div>
                <div class="info-item">
                    <label>Date</label>
                    <p>${Utils.formatDate(order.date)}</p>
                </div>
            </div>
            <div class="info-row" style="margin-bottom:16px;">
                <div class="info-item">
                    <label>Status</label>
                    <p><span class="order-status status-${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></p>
                </div>
                <div class="info-item">
                    <label>Total</label>
                    <p style="font-weight:700; color:var(--primary);">${Utils.formatPrice(order.total)}</p>
                </div>
            </div>
            <h4 style="margin-bottom:8px;">Items</h4>
            ${(order.items || []).map(item => `
                <div class="checkout-item" style="margin-bottom:8px;">
                    <img src="${item.image || 'assets/images/default-product.png'}" alt="" style="width:50px;height:50px;border-radius:8px;object-fit:cover;" onerror="this.src='assets/images/default-product.png'">
                    <div class="checkout-item-info">
                        <h4>${item.name}</h4>
                        <p>Qty: ${item.quantity} × ${Utils.formatPrice(item.price)}</p>
                    </div>
                    <div class="checkout-item-price">${Utils.formatPrice(item.price * item.quantity)}</div>
                </div>
            `).join('')}
            ${order.shipping ? `
                <h4 style="margin-top:16px; margin-bottom:8px;">Shipping Address</h4>
                <p style="color:#666; line-height:1.7;">
                    ${order.shipping.firstName} ${order.shipping.lastName}<br>
                    ${order.shipping.address}<br>
                    ${order.shipping.city}, ${order.shipping.state} ${order.shipping.zip}
                </p>
            ` : ''}
        </div>
    `;

    document.getElementById('orderDetailModal').classList.add('show');
}

// Close modal
document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('orderDetailModal').classList.remove('show');
});

document.getElementById('orderDetailModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('show');
    }
});