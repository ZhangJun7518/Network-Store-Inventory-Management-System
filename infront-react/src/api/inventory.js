import request from "./request";

// 获取库存流水
export const getInventoryLogs = (params) =>
  request.get("/inventory/logs", { params });

// 获取库存统计
export const getInventoryStats = (clientTime) =>
  request.get("/inventory/stats", { params: { client_time: clientTime } });

// 导出库存流水 Excel
export const exportInventoryLogs = (params) =>
  request.get("/inventory/export-logs", { params, responseType: "blob" });
