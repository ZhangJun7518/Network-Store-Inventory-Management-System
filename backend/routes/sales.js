/**
 * 销售与收银路由
 * 包含：收银结算（扣减库存+计算碳减排+记录库存流水）、获取销售记录
 */
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { checkPermission } = require("../middlewares/auth");
const { recordInventoryLog } = require("./inventory");

router.use(require("../middlewares/auth"));

// ==================== 1. 收银结算 ====================
router.post(
  "/checkout",
  checkPermission("sales:checkout"),
  async (req, res) => {
    const { goods_id, quantity } = req.body;
    const store_id = req.user.store_id;
    const operator_id = req.user.id;

    if (!goods_id || !quantity || quantity <= 0) {
      return res.json({ code: 400, msg: "参数错误" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. 查询商品并锁定行
      const [goods] = await connection.query(
        "SELECT * FROM goods WHERE id = ? FOR UPDATE",
        [goods_id],
      );
      if (goods.length === 0) throw new Error("商品不存在");
      const item = goods[0];

      if (item.stock < quantity)
        throw new Error("库存不足，当前库存: " + item.stock);

      // 2. 计算总价和碳减排量
      const total_price = item.sell_price * quantity;
      const carbon_saving_total = item.carbon_saving * quantity;

      // 3. 扣减库存
      await connection.query(
        "UPDATE goods SET stock = stock - ? WHERE id = ?",
        [quantity, goods_id],
      );

      // 4. 👈 记录库存流水
      await recordInventoryLog(connection, {
        goods_id: goods_id,
        store_id: store_id,
        change_type: "销售",
        change_quantity: -quantity,
        before_stock: item.stock,
        after_stock: item.stock - quantity,
        operator_id: operator_id,
        remark: `销售 ${item.goods_name} × ${quantity}`,
      });

      // 5. 写入销售记录
      await connection.query(
        "INSERT INTO sales(goods_id, quantity, total_price, carbon_saving_total, store_id, operator_id) VALUES (?,?,?,?,?,?)",
        [
          goods_id,
          quantity,
          total_price,
          carbon_saving_total,
          store_id,
          operator_id,
        ],
      );

      // 6. 写入审计日志
      await connection.query(
        "INSERT INTO audit_logs(user_id, action, details) VALUES (?, ?, ?)",
        [
          operator_id,
          "销售出库",
          `销售商品 ${item.goods_name} ${quantity}${item.unit}，金额 ${total_price}元`,
        ],
      );

      await connection.commit();
      res.json({
        code: 200,
        msg: "结算成功",
        data: { total_price, carbon_saving_total },
      });
    } catch (err) {
      await connection.rollback();
      console.error("收银结算失败:", err);
      res.json({ code: 500, msg: err.message });
    } finally {
      connection.release();
    }
  },
);

// ==================== 2. 获取销售记录 ====================
router.get("/list", async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin" || req.user.role === "hq_leader";
    const storeFilter = isAdmin
      ? ""
      : `WHERE s.store_id = ${req.user.store_id}`;

    const [rows] = await pool.query(`
      SELECT s.*, g.goods_name 
      FROM sales s 
      JOIN goods g ON s.goods_id = g.id 
      ${storeFilter} 
      ORDER BY s.sale_time DESC 
      LIMIT 100
    `);
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error("获取销售记录失败:", err);
    res.json({ code: 500, msg: "获取销售记录失败" });
  }
});

module.exports = router;
