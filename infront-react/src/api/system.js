import request from "./request";

// 获取审计日志
export const getSystemLogs = () => request.get("/system/logs");

// 一键生成测试数据
export const generateMockData = () => request.post("/system/generate-mock");

// 获取用户列表
export const getUserList = () => request.get("/system/users");

// 添加用户（占位）
export const addUser = (data) => request.post("/system/users", data);
