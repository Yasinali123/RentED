import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rented_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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
  updateProfile: async (payload) => (await api.patch("/auth/profile", payload)).data,
};

export const itemApi = {
  list: async (params) => (await api.get("/items", { params })).data,
  getById: async (itemId) => (await api.get(`/items/${itemId}`)).data,
  getMine: async () => (await api.get("/items/mine")).data,
  create: async (payload) => (await api.post("/items", payload)).data,
  update: async (itemId, payload) => (await api.patch(`/items/${itemId}`, payload)).data,
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
};

export const chatApi = {
  listConversations: async () => (await api.get("/chat/conversations")).data,
  createConversation: async (payload) => (await api.post("/chat/conversations", payload)).data,
  listMessages: async (conversationId) =>
    (await api.get(`/chat/conversations/${conversationId}/messages`)).data,
  sendMessage: async (conversationId, text) =>
    (await api.post(`/chat/conversations/${conversationId}/messages`, { text })).data,
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
  delete: async (id) => (await api.delete(`/notifications/${id}`)).data,
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

export default api;
