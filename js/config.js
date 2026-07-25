/* config.js */
// ============================================
// PShop - Configuration
// ============================================

// PShop/backend/Code.gs ek hi URL par sab actions handle karta hai
// (login, getProducts, createOrder, sendMessage, etc.)
// Isliye ek hi BASE_URL use karte hain.
const API = {
    BASE_URL: "https://script.google.com/macros/s/AKfycbxoXbHd5wLLpSF0GppqGpqLVyU2yv547Lu4knDFNJbxgnwXuvTsOck8lsxIk7aWLONV/exec"
};

const APP_CONFIG = {
    APP_NAME: "PShop",
    CURRENCY: "\u20B9",
    TAX_RATE: 0.18,
    FREE_SHIPPING_THRESHOLD: 499,
    SHIPPING_COST: 79,
    ITEMS_PER_PAGE: 12
};