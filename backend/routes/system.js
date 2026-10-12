/**
 * 系统设置与审计日志路由
 * 包含：审计日志查询、一键生成测试数据、用户管理（占位）
 */
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { checkPermission } = require("../middlewares/auth");

router.use(require("../middlewares/auth"));

// ==================== 1. 获取审计日志 ====================
router.get("/logs", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.*, 
        DATE_FORMAT(a.create_time, '%Y-%m-%d %H:%i:%s') as create_time_str,
        u.username 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.create_time DESC 
      LIMIT 100
    `);
    const formattedRows = rows.map((row) => ({
      ...row,
      create_time: row.create_time_str,
    }));
    res.json({ code: 200, data: formattedRows });
  } catch (err) {
    console.error("获取日志失败:", err);
    res.json({ code: 500, msg: "获取日志失败" });
  }
});

// ==================== 2. 一键生成模拟数据 ====================
router.post(
  "/generate-mock",
  checkPermission("system:reset"),
  async (req, res) => {
    try {
      await pool.query("TRUNCATE TABLE sales");

      let values = [];
      for (let i = 0; i < 500; i++) {
        const goodsId = Math.floor(Math.random() * 11) + 1;
        const qty = Math.floor(Math.random() * 3) + 1;
        const price = (Math.random() * 100 + 5).toFixed(2);
        const carbon = (Math.random() * 10).toFixed(2);
        const storeId = Math.random() > 0.5 ? 1 : 2;
        values.push(
          `(${goodsId}, ${qty}, ${price}, ${carbon}, DATE_SUB(NOW(), INTERVAL FLOOR(RAND()*30) DAY), ${storeId}, 5)`,
        );
      }
      const sql =
        "INSERT INTO sales(goods_id, quantity, total_price, carbon_saving_total, sale_time, store_id, operator_id) VALUES " +
        values.join(",");
      await pool.query(sql);

      res.json({ code: 200, msg: "已重新生成 500 条销售数据" });
    } catch (err) {
      console.error("生成模拟数据失败:", err);
      res.json({ code: 500, msg: "生成失败: " + err.message });
    }
  },
);

// ==================== 3. 获取用户列表 ====================
router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, username, real_name, role, store_id, create_time
      FROM users
      ORDER BY id ASC
    `);
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error("获取用户列表失败:", err);
    res.json({ code: 500, msg: "获取用户列表失败" });
  }
});

// ==================== 4. 添加用户（占位，暂不实现） ====================
router.post("/users", checkPermission("system:reset"), async (req, res) => {
  res.json({ code: 501, msg: "用户管理功能开发中，敬请期待" });
});

module.exports = router;
