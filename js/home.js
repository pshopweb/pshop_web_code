// ============================================
// PShop - Home Page
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initBannerSlider();
    loadProducts();
    initFilters();
    initSearch();
});

// Banner Slider
function initBannerSlider() {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.dot');
    let current = 0;

    function showSlide(index) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        current = index;
    }

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            showSlide(parseInt(dot.dataset.index));
        });
    });

    // Auto slide
    setInterval(() => {
        showSlide((current + 1) % slides.length);
    }, 3000);
}

// Load Products
async function loadProducts(filter = 'all') {
    const grid = document.getElementById('productsGrid');
    const spinner = document.getElementById('loadingSpinner');
    const noProducts = document.getElementById('noProducts');

    spinner.style.display = 'block';
    grid.style.display = 'none';
    noProducts.style.display = 'none';

    try {
        const response = await ApiService.getProducts({ filter });

        // Use demo products if API fails or returns empty
        const products = (response && response.products) ? response.products : getDemoProducts();

        if (products.length === 0) {
            noProducts.style.display = 'block';
        } else {
            grid.innerHTML = products.map(p => createProductCard(p)).join('');
            grid.style.display = 'grid';
        }
    } catch (error) {
        // Show demo products on error
        const products = getDemoProducts();
        grid.innerHTML = products.map(p => createProductCard(p)).join('');
        grid.style.display = 'grid';
    }

    spinner.style.display = 'none';
}

// Create Product Card
function createProductCard(product) {
    const badge = product.badge ? `<span class="product-card-badge badge-${product.badge}">${product.badge.toUpperCase()}</span>` : '';
    const oldPrice = product.oldPrice ? `<span class="old">${Utils.formatPrice(product.oldPrice)}</span>` : '';

    return `
        <div class="product-card" onclick="viewProduct('${product.id}')">
            <div class="product-card-image">
                ${badge}
                <img src="${product.image || 'assets/images/default-product.png'}" alt="${Utils.htmlEscape(product.name)}" onerror="this.src='assets/images/default-product.png'">
            </div>
            <div class="product-card-body">
                <h3>${Utils.htmlEscape(product.name)}</h3>
                <div class="product-card-price">
                    ${Utils.formatPrice(product.price)} ${oldPrice}
                </div>
                <div class="product-card-rating">
                    <span class="stars">${Utils.renderStars(product.rating || 4)}</span>
                    <span>(${product.reviews || 0})</span>
                </div>
            </div>
            <div class="product-card-actions">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart('${product.id}')">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
}

// View Product
function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// Add to Cart (quick add)
function addToCart(productId) {
    const products = getDemoProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let cart = JSON.parse(localStorage.getItem('pshop_cart') || '[]');
    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }

    localStorage.setItem('pshop_cart', JSON.stringify(cart));
    Auth.updateCartCount();
    Utils.showToast(`${product.name} added to cart!`, 'success');
}

// Init Filters
function initFilters() {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadProducts(btn.dataset.filter);
        });
    });
}

// Init Search
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchInput && searchBtn) {
        const performSearch = Utils.debounce(() => {
            const query = searchInput.value.trim().toLowerCase();
            filterProducts(query);
        }, 300);

        searchInput.addEventListener('input', performSearch);
        searchBtn.addEventListener('click', performSearch);
    }
}

function filterProducts(query) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        card.style.display = name.includes(query) || !query ? '' : 'none';
    });
}

// Demo Products
function getDemoProducts() {
    return [
        { id: '1', name: 'Wireless Bluetooth Headphones', price: 79.99, oldPrice: 129.99, image: 'assets/images/default-product.png', rating: 4.5, reviews: 128, badge: 'sale', category: 'electronics' },
        { id: '2', name: 'Smart Watch Pro', price: 199.99, image: 'assets/images/default-product.png', rating: 4.8, reviews: 256, badge: 'new', category: 'electronics' },
        { id: '3', name: 'Running Shoes Ultra', price: 89.99, oldPrice: 119.99, image: 'assets/images/default-product.png', rating: 4.3, reviews: 89, badge: 'sale', category: 'sports' },
        { id: '4', name: 'Premium Leather Backpack', price: 59.99, image: 'assets/images/default-product.png', rating: 4.6, reviews: 167, badge: 'hot', category: 'accessories' },
        { id: '5', name: 'Organic Cotton T-Shirt', price: 29.99, image: 'assets/images/default-product.png', rating: 4.2, reviews: 342, badge: 'new', category: 'clothing' },
        { id: '6', name: 'Portable Bluetooth Speaker', price: 49.99, oldPrice: 69.99, image: 'assets/images/default-product.png', rating: 4.4, reviews: 198, badge: 'sale', category: 'electronics' },
        { id: '7', name: 'Yoga Mat Premium', price: 34.99, image: 'assets/images/default-product.png', rating: 4.7, reviews: 76, badge: '', category: 'sports' },
        { id: '8', name: 'Ceramic Coffee Mug Set', price: 24.99, image: 'assets/images/default-product.png', rating: 4.1, reviews: 53, badge: 'new', category: 'home' },
        { id: '9', name: 'Laptop Stand Adjustable', price: 44.99, oldPrice: 59.99, image: 'assets/images/default-product.png', rating: 4.5, reviews: 112, badge: 'sale', category: 'electronics' },
        { id: '10', name: 'Skincare Gift Set', price: 39.99, image: 'assets/images/default-product.png', rating: 4.6, reviews: 88, badge: 'new', category: 'beauty' },
        { id: '11', name: 'USB-C Hub Adapter', price: 32.99, image: 'assets/images/default-product.png', rating: 4.3, reviews: 215, badge: '', category: 'electronics' },
        { id: '12', name: 'Sunglasses UV Protection', price: 27.99, oldPrice: 42.99, image: 'assets/images/default-product.png', rating: 4.4, reviews: 143, badge: 'sale', category: 'accessories' }
    ];
}