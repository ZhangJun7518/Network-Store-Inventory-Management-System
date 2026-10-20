const jwt = require("jsonwebtoken");
require("dotenv").config();

const auth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ code: 401, msg: "未提供访问令牌，请重新登录" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, msg: "令牌无效或已过期" });
  }
};

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
  stocker: ["sales:checkout", "product:stock_in"], // 👈 同步更新
};

const checkPermission = (permissionCode) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    if (permissions.includes(permissionCode)) {
      next();
    } else {
      res
        .status(403)
        .json({ code: 403, msg: `权限不足，缺少权限: ${permissionCode}` });
    }
  };
};

module.exports = auth;
module.exports.checkPermission = checkPermission;
