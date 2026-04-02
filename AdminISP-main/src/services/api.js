// services/api.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API = axios.create({ baseURL: BASE_URL });

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => API.post("/auth/login", { email, password }),
  getMe: () => API.get("/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    API.put("/auth/change-password", { currentPassword, newPassword }),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardAPI = {
  getStats:         ()                       => API.get("/dashboard/stats"),
  getTotalUsers:    ()                       => API.get("/dashboard/total-users"),
  getActiveUsers:   ()                       => API.get("/dashboard/active-users"),
  getMonthlyRevenue:()                       => API.get("/dashboard/monthly-revenue"),
  getChartData:     (category, timeframe)    => API.get("/dashboard/charts", { params: { category, timeframe } }),
};

// ── Clients ───────────────────────────────────────────────────
export const clientsAPI = {
  list:       (params) => API.get("/clients", { params }),
  getCounts:  ()       => API.get("/clients/counts"),
  get:        (id)     => API.get(`/clients/${id}`),
  create:     (data)   => API.post("/clients", data),
  update:     (id, d)  => API.put(`/clients/${id}`, d),
  delete:     (id)     => API.delete(`/clients/${id}`),
};

// ── Packages ──────────────────────────────────────────────────
export const packagesAPI = {
  list:      (params) => API.get("/packages", { params }),
  getCounts: ()       => API.get("/packages/counts"),
  get:       (id)     => API.get(`/packages/${id}`),
  create:    (data)   => API.post("/packages", data),
  update:    (id, d)  => API.put(`/packages/${id}`, d),
  delete:    (id)     => API.delete(`/packages/${id}`),
};

// ── Payments ──────────────────────────────────────────────────
export const paymentsAPI = {
  list:         (params)  => API.get("/payments", { params }),
  getEarnings:  ()        => API.get("/payments/earnings"),
  record:       (data)    => API.post("/payments", data),
  updateStatus: (id, status) => API.patch(`/payments/${id}/status`, { status }),
  delete:       (id)      => API.delete(`/payments/${id}`),
};

// ── Tickets ───────────────────────────────────────────────────
export const ticketsAPI = {
  list:         (params)  => API.get("/tickets", { params }),
  getCounts:    ()        => API.get("/tickets/counts"),
  get:          (id)      => API.get(`/tickets/${id}`),
  create:       (data)    => API.post("/tickets", data),
  updateStatus: (id, s)   => API.patch(`/tickets/${id}/status`, { status: s }),
  delete:       (id)      => API.delete(`/tickets/${id}`),
};

// ── Vouchers ──────────────────────────────────────────────────
export const vouchersAPI = {
  list:     (params) => API.get("/vouchers", { params }),
  generate: (data)   => API.post("/vouchers/generate", data),
  get:      (id)     => API.get(`/vouchers/${id}`),
  delete:   (id)     => API.delete(`/vouchers/${id}`),
};

// ── Sites ─────────────────────────────────────────────────────
export const sitesAPI = {
  list:   (params) => API.get("/sites", { params }),
  get:    (id)     => API.get(`/sites/${id}`),
  create: (data)   => API.post("/sites", data),
  update: (id, d)  => API.put(`/sites/${id}`, d),
  delete: (id)     => API.delete(`/sites/${id}`),
};

// ── Leads ─────────────────────────────────────────────────────
export const leadsAPI = {
  list:   (params) => API.get("/leads", { params }),
  create: (data)   => API.post("/leads", data),
  update: (id, d)  => API.put(`/leads/${id}`, d),
  delete: (id)     => API.delete(`/leads/${id}`),
};

// ── Expenses ──────────────────────────────────────────────────
export const expensesAPI = {
  list:         (params) => API.get("/expenses", { params }),
  getCategories:()       => API.get("/expenses/categories"),
  create:       (data)   => API.post("/expenses", data),
  update:       (id, d)  => API.put(`/expenses/${id}`, d),
  delete:       (id)     => API.delete(`/expenses/${id}`),
};

// ── Active Sessions ───────────────────────────────────────────
export const activeSessionsAPI = {
  list:       (params) => API.get("/active-sessions", { params }),
  start:      (data)   => API.post("/active-sessions", data),
  end:        (id, d)  => API.patch(`/active-sessions/${id}/end`, d),
};

// ── Messages ──────────────────────────────────────────────────
export const messagesAPI = {
  list:     (params) => API.get("/messages", { params }),
  send:     (data)   => API.post("/messages/send", data),
  sendBulk: (data)   => API.post("/messages/bulk", data),
};

// ── Emails ────────────────────────────────────────────────────
export const emailsAPI = {
  list: (params) => API.get("/emails", { params }),
  send: (data)   => API.post("/emails/send", data),
};

// ── Campaigns ─────────────────────────────────────────────────
export const campaignsAPI = {
  list:   (params) => API.get("/campaigns", { params }),
  create: (data)   => API.post("/campaigns", data),
  send:   (id)     => API.post(`/campaigns/${id}/send`),
  delete: (id)     => API.delete(`/campaigns/${id}`),
};

export default API;
