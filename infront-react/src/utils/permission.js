// 前端权限字典（与后端保持一致）
const ROLE_PERMISSIONS = {
  admin: [
    "product:add",
    "product:delete",
    "product:stock_in",
    "sales:checkout",
    "transfer:execute",
    "system:reset",
  ],
  hq_leader: ["transfer:execute", "product:stock_in"],
  store_manager: [
    "product:add",
    "product:stock_in",
    "sales:checkout",
    "transfer:execute",
  ],
  stocker: ["sales:checkout", "product:stock_in"], // 👈 理货员有收银 + 扫码入库
};

export const hasPermission = (permissionCode) => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const permissions = ROLE_PERMISSIONS[userInfo.role] || [];
  return permissions.includes(permissionCode);
};
