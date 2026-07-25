/* ==========================================================================
   PShop — API client
   Talks to the Google Apps Script Web App. Apps Script does not allow custom
   headers on cross-origin POSTs without a preflight, so requests are sent as
   text/plain with a JSON body — the standard GAS-friendly pattern.
   Falls back to the bundled mock backend when no URL is configured or the
   network call fails, so the UI never dead-ends.
   ========================================================================== */
import { CONFIG } from './config.js';
import { Store } from './storage.js';
import { mockRequest } from './mock-backend.js';

let backendHealthy = Boolean(CONFIG.API_BASE_URL);

/** Low-level POST to Apps Script. */
async function post(action, payload, signal) {
  const body = JSON.stringify({
    action,
    payload,
    token: Store.get(CONFIG.KEYS.TOKEN, null)
  });
  const res = await fetch(CONFIG.API_BASE_URL, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    redirect: 'follow',
    signal
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Malformed JSON from backend'); }
}

/**
 * Call an API action.
 * @returns {Promise<{success:boolean,data:any,message:string}>}
 */
export async function api(action, payload = {}, { timeout = CONFIG.API_TIMEOUT } = {}) {
  if (CONFIG.API_BASE_URL && backendHealthy) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const out = await post(action, payload, ctrl.signal);
      clearTimeout(timer);
      if (out && typeof out.success === 'boolean') return out;
      return { success: true, data: out, message: '' };
    } catch (err) {
      clearTimeout(timer);
      console.warn(`[PShop API] "${action}" failed (${err.message}).`,
        CONFIG.USE_MOCK_FALLBACK ? 'Falling back to local backend.' : '');
      if (!CONFIG.USE_MOCK_FALLBACK) {
        return { success: false, data: null, message: 'Network error. Please try again.' };
      }
      backendHealthy = false;                  // stop retrying every call this session
      setTimeout(() => { backendHealthy = Boolean(CONFIG.API_BASE_URL); }, 60000);
    }
  }
  return mockRequest(action, payload);
}

/* ---------------------- Typed helpers used by pages ---------------------- */
export const API = {
  /* auth */
  signup:         d => api('signup', d),
  login:          d => api('login', d),
  sendOtp:        d => api('sendOtp', d),
  verifyOtp:      d => api('verifyOtp', d),
  resetPassword:  d => api('resetPassword', d),
  changePassword: d => api('changePassword', d),
  updateProfile:  d => api('updateProfile', d),

  /* catalogue */
  getProducts:    d => api('getProducts', d),
  getProduct:     d => api('getProduct', d),
  searchProducts: d => api('searchProducts', d),
  getCategories:  () => api('getCategories'),
  getBanners:     () => api('getBanners'),
  getFilters:     d => api('getFilters', d),
  getFaqs:        () => api('getFaqs'),
  getCoupons:     () => api('getCoupons'),
  addReview:      d => api('addReview', d),

  /* orders */
  placeOrder:     d => api('placeOrder', d),
  getOrders:      d => api('getOrders', d),
  getOrder:       d => api('getOrder', d),
  trackOrder:     d => api('trackOrder', d),
  cancelOrder:    d => api('cancelOrder', d),
  returnOrder:    d => api('returnOrder', d),

  /* payment */
  savePayment:    d => api('savePayment', d),
  verifyCoupon:   d => api('verifyCoupon', d),

  /* engagement */
  getMessages:    () => api('getMessages'),
  sendMessage:    d => api('sendMessage', d),
  getNotifications: () => api('getNotifications'),
  subscribeNewsletter: d => api('subscribeNewsletter', d),
  contact:        d => api('contact', d),

  /* admin */
  adminStats:       () => api('adminStats'),
  adminUpdateOrder: d => api('adminUpdateOrder', d)
};

export const isLiveBackend = () => Boolean(CONFIG.API_BASE_URL) && backendHealthy;
