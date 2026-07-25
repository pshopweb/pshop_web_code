/* product.js */
// ============================================
// PShop - Product Detail Page
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadProduct();
    initQuantityControls();
    initAddToCart();
});

async function loadProduct() {
    const productId = Utils.getParam('id');

    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    // Try API first, fall back to demo
    let product = null;

    try {
        const response = await ApiService.getProduct(productId);
        if (response && response.product) {
            product = response.product;
        }
    } catch (e) {
        // Use demo data
    }

    if (!product) {
        const demoProducts = getDemoProducts();
        product = demoProducts.find(p => p.id === productId);
    }

    if (!product) {
        Utils.showToast('Product not found', 'error');
        return;
    }

    // Update page
    document.title = `PShop - ${product.name}`;
    document.getElementById('breadcrumbName').textContent = product.name;
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productPrice').textContent = Utils.formatPrice(product.price);
    document.getElementById('productDescription').textContent = product.description || 'High-quality product available at PShop. Perfect for everyday use with premium materials and excellent craftsmanship.';
    document.getElementById('productCategory').textContent = product.category || 'General';
    document.getElementById('productSku').textContent = `PS-${productId.padStart(5, '0')}`;
    document.getElementById('productReviews').textContent = `(${product.reviews || 0} reviews)`;

    const img = document.getElementById('productImage');
    img.src = product.image || 'assets/images/default-product.png';
    img.onerror = function () { this.src = 'assets/images/default-product.png'; };

    if (product.oldPrice) {
        document.getElementById('productOldPrice').textContent = Utils.formatPrice(product.oldPrice);
    }

    if (product.badge) {
        const badge = document.getElementById('productBadge');
        badge.textContent = product.badge.toUpperCase();
        badge.className = `product-badge badge-${product.badge}`;
    }

    // Store product for cart
    window.currentProduct = product;
}

function initQuantityControls() {
    const minus = document.getElementById('qtyMinus');
    const plus = document.getElementById('qtyPlus');
    const input = document.getElementById('qtyInput');

    if (minus && plus && input) {
        minus.addEventListener('click', () => {
            const val = parseInt(input.value);
            if (val > 1) input.value = val - 1;
        });

        plus.addEventListener('click', () => {
            const val = parseInt(input.value);
            if (val < 99) input.value = val + 1;
        });

        input.addEventListener('change', () => {
            let val = parseInt(input.value);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 99) val = 99;
            input.value = val;
        });
    }
}

function initAddToCart() {
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            if (!window.currentProduct) return;

            const qty = parseInt(document.getElementById('qtyInput').value);
            const product = window.currentProduct;

            let cart = JSON.parse(localStorage.getItem('pshop_cart') || '[]');
            const existing = cart.find(item => item.id === product.id);

            if (existing) {
                existing.quantity += qty;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: qty
                });
            }

            localStorage.setItem('pshop_cart', JSON.stringify(cart));
            Auth.updateCartCount();
            Utils.showToast(`${qty}x ${product.name} added to cart!`, 'success');
        });
    }

    // Wishlist button
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', () => {
            const icon = wishlistBtn.querySelector('i');
            if (icon.classList.contains('far')) {
                icon.classList.replace('far', 'fas');
                icon.style.color = '#dc2626';
                Utils.showToast('Added to wishlist!', 'success');
            } else {
                icon.classList.replace('fas', 'far');
                icon.style.color = '';
                Utils.showToast('Removed from wishlist', 'info');
            }
        });
    }
}

// Reuse demo products from home.js
function getDemoProducts() {
    return [
        { id: '1', name: 'Wireless Bluetooth Headphones', price: 79.99, oldPrice: 129.99, image: 'assets/images/default-product.png', rating: 4.5, reviews: 128, badge: 'sale', category: 'Electronics' },
        { id: '2', name: 'Smart Watch Pro', price: 199.99, image: 'assets/images/default-product.png', rating: 4.8, reviews: 256, badge: 'new', category: 'Electronics' },
        { id: '3', name: 'Running Shoes Ultra', price: 89.99, oldPrice: 119.99, image: 'assets/images/default-product.png', rating: 4.3, reviews: 89, badge: 'sale', category: 'Sports' },
        { id: '4', name: 'Premium Leather Backpack', price: 59.99, image: 'assets/images/default-product.png', rating: 4.6, reviews: 167, badge: 'hot', category: 'Accessories' },
        { id: '5', name: 'Organic Cotton T-Shirt', price: 29.99, image: 'assets/images/default-product.png', rating: 4.2, reviews: 342, badge: 'new', category: 'Clothing' },
        { id: '6', name: 'Portable Bluetooth Speaker', price: 49.99, oldPrice: 69.99, image: 'assets/images/default-product.png', rating: 4.4, reviews: 198, badge: 'sale', category: 'Electronics' },
        { id: '7', name: 'Yoga Mat Premium', price: 34.99, image: 'assets/images/default-product.png', rating: 4.7, reviews: 76, badge: '', category: 'Sports' },
        { id: '8', name: 'Ceramic Coffee Mug Set', price: 24.99, image: 'assets/images/default-product.png', rating: 4.1, reviews: 53, badge: 'new', category: 'Home' },
        { id: '9', name: 'Laptop Stand Adjustable', price: 44.99, oldPrice: 59.99, image: 'assets/images/default-product.png', rating: 4.5, reviews: 112, badge: 'sale', category: 'Electronics' },
        { id: '10', name: 'Skincare Gift Set', price: 39.99, image: 'assets/images/default-product.png', rating: 4.6, reviews: 88, badge: 'new', category: 'Beauty' },
        { id: '11', name: 'USB-C Hub Adapter', price: 32.99, image: 'assets/images/default-product.png', rating: 4.3, reviews: 215, badge: '', category: 'Electronics' },
        { id: '12', name: 'Sunglasses UV Protection', price: 27.99, oldPrice: 42.99, image: 'assets/images/default-product.png', rating: 4.4, reviews: 143, badge: 'sale', category: 'Accessories' }
    ];
}