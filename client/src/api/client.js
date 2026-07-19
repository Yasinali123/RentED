import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rented_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor to perform silent token rotation on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/signup") &&
      !originalRequest.url.includes("/auth/refresh") &&
      !originalRequest.url.includes("/auth/verify-email")
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await authApi.refresh();
        if (refreshResponse.accessToken) {
          localStorage.setItem("rented_token", refreshResponse.accessToken);
        }
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("rented_token");
        // Dispatch custom unauthorized event so AuthContext can handle redirect without full reload
        window.dispatchEvent(new Event("unauthorized"));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

export const authApi = {
  signup: async (payload) => (await api.post("/auth/signup", payload)).data,
  login: async (payload) => (await api.post("/auth/login", payload)).data,
  me: async () => (await api.get("/auth/me")).data,
  googleLogin: async (payload) => (await api.post("/auth/google", payload)).data,
  forgotPassword: async (payload) => (await api.post("/auth/forgot-password", payload)).data,
  verifyOtp: async (payload) => (await api.post("/auth/verify-otp", payload)).data,
  sendSignupOtp: async (payload) => (await api.post("/auth/send-signup-otp", payload)).data,
  verifySignupOtp: async (payload) => (await api.post("/auth/verify-signup-otp", payload)).data,
  getUsers: async () => (await api.get("/auth/users")).data,
  updateUserStatus: async (userId, payload) => (await api.patch(`/auth/users/${userId}/status`, payload)).data,
  addBalance: async (payload) => (await api.post("/auth/add-balance", payload)).data,
  updateProfile: async (payload, config = {}) => (await api.patch("/auth/profile", payload, config)).data,
  verifyEmail: async (payload) => (await api.post("/auth/verify-email", payload)).data,
  refresh: async () => (await api.post("/auth/refresh")).data,
  logout: async () => (await api.post("/auth/logout")).data,
  listSessions: async () => (await api.get("/auth/sessions")).data,
  deleteSession: async (sessionId) => (await api.delete(`/auth/sessions/${sessionId}`)).data,
  logoutOtherSessions: async () => (await api.post("/auth/sessions/logout-other")).data,
  logoutAllSessions: async () => (await api.post("/auth/sessions/logout-all")).data,
};

export const itemApi = {
  list: async (params) => (await api.get("/items", { params })).data,
  getById: async (itemId) => (await api.get(`/items/${itemId}`)).data,
  getMine: async () => (await api.get("/items/mine")).data,
  create: async (payload, config = {}) => (await api.post("/items", payload, config)).data,
  update: async (itemId, payload, config = {}) => (await api.patch(`/items/${itemId}`, payload, config)).data,
  delete: async (itemId) => (await api.delete(`/items/${itemId}`)).data,
  toggleWishlist: async (itemId) => (await api.post(`/items/${itemId}/wishlist`)).data,
};

export const rentalApi = {
  create: async (payload) => (await api.post("/rentals", payload)).data,
  createPurchase: async (payload) =>
    (await api.post("/rentals", { ...payload, requestType: "purchase" })).data,
  getMine: async () => (await api.get("/rentals/mine")).data,
  accept: async (requestId) => (await api.patch(`/rentals/${requestId}/accept`)).data,
  reject: async (requestId) => (await api.patch(`/rentals/${requestId}/reject`)).data,
  claimTask: async (requestId) => (await api.patch(`/rentals/${requestId}/claim`)).data,
  schedulePickup: async (requestId) => (await api.patch(`/rentals/${requestId}/schedule-pickup`)).data,
  verifyPickup: async (requestId, qrCode) => (await api.patch(`/rentals/${requestId}/verify-pickup`, { qrCode })).data,
  startDelivery: async (requestId) => (await api.patch(`/rentals/${requestId}/start-delivery`)).data,
  verifyDelivery: async (requestId, qrCode, proofPhoto) => (await api.patch(`/rentals/${requestId}/verify-delivery`, { qrCode, proofPhoto })).data,
  complete: async (requestId) => (await api.patch(`/rentals/${requestId}/confirm-receipt`)).data,
  requestReturn: async (requestId) => (await api.patch(`/rentals/${requestId}/request-return`)).data,
  verifyReturn: async (requestId) => (await api.patch(`/rentals/${requestId}/verify-return`)).data,
  completeReturn: async (requestId) => (await api.patch(`/rentals/${requestId}/complete-return`)).data,
  cancel: async (requestId) => (await api.patch(`/rentals/${requestId}/cancel`)).data,
  adminUpdateRental: async (requestId, payload) => (await api.patch(`/rentals/${requestId}/admin-status`, payload)).data,
  rejectTask: async (requestId, reason) => (await api.patch(`/rentals/${requestId}/reject-assignment`, { reason })).data,
  handoverSignal: async (requestId) => (await api.post(`/rentals/${requestId}/handover`)).data,
};

export const paymentApi = {
  createIntent: async (payload) => (await api.post("/payments/intent", payload)).data,
  verify: async (payload) => (await api.post("/payments/verify", payload)).data,
  withdraw: async (payload) => (await api.post("/payments/withdraw", payload)).data,
  listWithdrawals: async () => (await api.get("/payments/withdrawals")).data,
  processWithdrawal: async (id, payload) => (await api.patch(`/payments/withdrawals/${id}`, payload)).data,
};

export const chatApi = {
  listConversations: async () => (await api.get("/chat/conversations")).data,
  createConversation: async (payload) => (await api.post("/chat/conversations", payload)).data,
  create: async (payload) => (await api.post("/chat/create", payload)).data,
  listMessages: async (conversationId, params = {}) =>
    (await api.get(`/chat/conversations/${conversationId}/messages`, { params })).data,
  sendMessage: async (conversationId, text, attachments = null) =>
    (await api.post(`/chat/conversations/${conversationId}/messages`, { text, attachments })).data,
  markAsRead: async (conversationId) =>
    (await api.patch(`/chat/conversations/${conversationId}/read`)).data,
  deleteMessage: async (messageId) =>
    (await api.delete(`/chat/message/${messageId}`)).data,
  uploadAttachment: async (formData) =>
    (await api.post("/chat/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })).data,
};

export const reviewApi = {
  create: async (payload) => (await api.post("/reviews", payload)).data,
  getUserReviews: async (userId) => (await api.get(`/reviews/user/${userId}`)).data,
};

export const dashboardApi = {
  get: async () => (await api.get("/dashboard")).data,
};

export const suggestionApi = {
  getNearby: async () => (await api.get("/suggestions/nearby")).data,
};

export const disputeApi = {
  raise: async (payload) => (await api.post("/disputes", payload)).data,
  list: async () => (await api.get("/disputes")).data,
  resolve: async (disputeId, payload) => (await api.post(`/disputes/${disputeId}/resolve`, payload)).data,
};

export const notificationApi = {
  list: async () => (await api.get("/notifications")).data,
  readAll: async () => (await api.post("/notifications/read-all")).data,
  readNotification: async (payload) => (await api.post("/notifications/read", payload)).data,
  delete: async (id) => (await api.delete(`/notifications/${id}`)).data,
  saveFcmToken: async (payload) => (await api.post("/notifications/fcm-token", payload)).data,
};

export const collegeApi = {
  list: async () => (await api.get("/colleges")).data,
  create: async (payload) => (await api.post("/colleges", payload)).data,
  delete: async (id) => (await api.delete(`/colleges/${id}`)).data,
};

export const settingsApi = {
  get: async () => (await api.get("/dashboard/settings")).data,
  update: async (payload) => (await api.post("/dashboard/settings", payload)).data,
};

export const couponApi = {
  list: async () => (await api.get("/coupons")).data,
  create: async (payload) => (await api.post("/coupons", payload)).data,
  toggle: async (id) => (await api.patch(`/coupons/${id}/toggle`)).data,
  delete: async (id) => (await api.delete(`/coupons/${id}`)).data,
  validate: async (payload) => (await api.post("/coupons/validate", payload)).data,
};

export const locationApi = {
  reverseGeocode: async (payload) => (await api.post("/location/reverse-geocode", payload)).data,
  listNearbyItems: async (params) => (await api.get("/location/nearby-items", { params })).data,
  listNearbyColleges: async (params) => (await api.get("/location/nearby-colleges", { params })).data,
  saveUserLocation: async (payload) => (await api.post("/location/save-user-location", payload)).data,
  saveItemLocation: async (payload) => (await api.post("/location/save-item-location", payload)).data,
};

export const searchApi = {
  suggestions: async (params) => (await api.get("/search/suggestions", { params })).data,
  logQuery: async (payload) => (await api.post("/search/log", payload)).data,
};

export const invoiceApi = {
  getMyInvoices: async () => (await api.get("/invoices/my")).data,
  getSalesInvoices: async () => (await api.get("/invoices/sales")).data,
  getAllInvoices: async () => (await api.get("/invoices/all")).data,
  getByOrder: async (orderId) => (await api.get(`/invoices/order/${orderId}`)).data,
  getById: async (id) => (await api.get(`/invoices/${id}`)).data,
  download: async (id) => (await api.get(`/invoices/${id}/download`)).data,
  resend: async (id) => (await api.post(`/invoices/${id}/resend`)).data,
};

export default api;
