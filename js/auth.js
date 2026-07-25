/* auth.js */
// ============================================
// PShop - Authentication Manager
// ============================================

const Auth = {
    // Get current user
    getUser() {
        const user = localStorage.getItem('pshop_user');
        return user ? JSON.parse(user) : null;
    },

    // Set user
    setUser(user) {
        localStorage.setItem('pshop_user', JSON.stringify(user));
        this.updateUI();
    },

    // Check if logged in
    isLoggedIn() {
        return this.getUser() !== null;
    },

    // Login
    async login(email, password) {
        try {
            const response = await ApiService.login(email, password);
            if (response && response.success) {
                this.setUser(response.user);
                return { success: true, user: response.user };
            }
            return { success: false, message: response?.message || 'Login failed' };
        } catch (error) {
            return { success: false, message: 'Network error. Please try again.' };
        }
    },

    // Signup
    async signup(data) {
        try {
            const response = await ApiService.signup(data);
            if (response && response.success) {
                this.setUser(response.user);
                return { success: true, user: response.user };
            }
            return { success: false, message: response?.message || 'Signup failed' };
        } catch (error) {
            return { success: false, message: 'Network error. Please try again.' };
        }
    },

    // Logout
    logout() {
        localStorage.removeItem('pshop_user');
        localStorage.removeItem('pshop_cart');
        window.location.href = '../index.html';
    },

    // Require auth (redirect if not logged in)
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'html/login.html';
            return false;
        }
        return true;
    },

    // Update UI based on auth state
    updateUI() {
        const user = this.getUser();
        const userNameEl = document.getElementById('userName');
        const profileNameEl = document.getElementById('profileName');

        if (userNameEl) {
            userNameEl.textContent = user ? (user.name || 'Account') : 'Account';
        }
        if (profileNameEl) {
            profileNameEl.textContent = user ? (user.name || 'User') : 'User';
        }
    },

    // Initialize
    init() {
        this.updateUI();

        // Logout button
        const logoutBtns = document.querySelectorAll('#logoutBtn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });

        // User dropdown
        const userBtn = document.getElementById('userBtn');
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (userBtn && dropdownMenu) {
            userBtn.addEventListener('click', () => {
                dropdownMenu.classList.toggle('show');
            });
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-menu')) {
                    dropdownMenu.classList.remove('show');
                }
            });
        }

        // Update cart count
        this.updateCartCount();
    },

    // Update cart count in navbar
    updateCartCount() {
        const cart = CartManager.getCart();
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = count;
        });
    }
};

// Cart Manager (used by auth for count updates)
const CartManager = {
    getCart() {
        const cart = localStorage.getItem('pshop_cart');
        return cart ? JSON.parse(cart) : [];
    }
};

// Mobile menu
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNav = document.getElementById('mobileNav');
if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('show');
    });
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});