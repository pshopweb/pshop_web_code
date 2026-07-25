/* api.js */
// ============================================
// PShop - API Service
// ============================================

const ApiService = {
    // Generic fetch with timeout
    async fetchWithTimeout(url, options = {}, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return await response.json();
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    },

    // POST request
    // NOTE: mode 'no-cors' hata diya gaya hai — usse response kabhi read
    // nahi hota (opaque response). Google Apps Script Content-Type
    // 'text/plain' ke saath CORS preflight (OPTIONS) bhi trigger nahi karta,
    // isliye ye Apps Script ke saath sahi tarike se kaam karega.
    async post(url, data) {
        return this.fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        });
    },

    // GET request
    async get(url) {
        return this.fetchWithTimeout(url, {
            method: 'GET'
        });
    },

    // Login
    async login(email, password) {
        return this.post(API.BASE_URL, {
            action: 'login',
            email,
            password
        });
    },

    // Signup
    async signup(data) {
        return this.post(API.BASE_URL, {
            action: 'signup',
            ...data
        });
    },

    // Get products
    async getProducts(filters = {}) {
        return this.post(API.BASE_URL, {
            action: 'getProducts',
            ...filters
        });
    },

    // Get single product
    async getProduct(productId) {
        return this.post(API.BASE_URL, {
            action: 'getProduct',
            productId
        });
    },

    // Place order
    async placeOrder(orderData) {
        return this.post(API.BASE_URL, {
            action: 'placeOrder',
            ...orderData
        });
    },

    // Get orders
    async getOrders(userId) {
        return this.post(API.BASE_URL, {
            action: 'getOrders',
            userId
        });
    },

    // Send message
    async sendMessage(data) {
        return this.post(API.BASE_URL, {
            action: 'sendMessage',
            ...data
        });
    },

    // Get messages
    async getMessages(userId) {
        return this.post(API.BASE_URL, {
            action: 'getMessages',
            userId
        });
    },

    // Update profile
    async updateProfile(data) {
        return this.post(API.BASE_URL, {
            action: 'updateProfile',
            ...data
        });
    }
};
