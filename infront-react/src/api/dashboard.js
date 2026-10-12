import request from "./request";

export const getDashboardStats = (clientTime) =>
  request.get("/dashboard/stats", { params: { client_time: clientTime } });

export const getDashboardTrend = (clientTime) =>
  request.get("/dashboard/trend", { params: { client_time: clientTime } });

export const getDashboardCategory = () => request.get("/dashboard/category");

export const getDashboardWarnings = () => request.get("/dashboard/warnings");

export const exportReplenish = () =>
  request.get("/dashboard/export-replenish", { responseType: "blob" });

export const getTurnover = (clientTime) =>
  request.get("/dashboard/turnover", { params: { client_time: clientTime } });

export const getTodos = (clientTime) =>
  request.get("/dashboard/todos", { params: { client_time: clientTime } });

// 👈 新增：获取最近销售记录
export const getRecentSales = () => request.get("/dashboard/recent-sales");
