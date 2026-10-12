/**
 * 智能调拨路由
 * 包含：获取全局资源、执行跨店调拨、获取调拨记录
 * 调拨时自动记录库存流水
 */
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { checkPermission } = require("../middlewares/auth");
const { recordInventoryLog } = require("./inventory");

router.use(require("../middlewares/auth"));

// ==================== 1. 获取全局资源 ====================
router.get("/resources", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, goods_name, category, store_id, stock FROM goods ORDER BY goods_name",
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error("获取资源失败:", err);
    res.json({ code: 500, msg: "获取资源失败" });
  }
});

// ==================== 2. 执行跨店调拨 ====================
router.post(
  "/execute",
  checkPermission("transfer:execute"),
  async (req, res) => {
    const { from_store_id, to_store_id, goods_id, quantity } = req.body;

    if (from_store_id === to_store_id) {
      return res.json({ code: 400, msg: "源门店和目标门店不能相同" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. 查询来源商品并加锁
      const [goods] = await connection.query(
        "SELECT * FROM goods WHERE id = ? AND store_id = ? FOR UPDATE",
        [goods_id, from_store_id],
      );
      if (goods.length === 0) throw new Error("来源门店不存在此商品");
      const item = goods[0];

      if (item.stock < quantity)
        throw new Error(`来源门店库存不足，当前库存: ${item.stock}`);

      // 2. 扣减来源门店库存
      await connection.query(
        "UPDATE goods SET stock = stock - ? WHERE id = ?",
        [quantity, goods_id],
      );

      // 3. 👈 记录来源门店的库存流水（减少）
      await recordInventoryLog(connection, {
        goods_id: goods_id,
        store_id: from_store_id,
        change_type: "调拨",
        change_quantity: -quantity,
        before_stock: item.stock,
        after_stock: item.stock - quantity,
        operator_id: req.user.id,
        remark: `调拨 ${item.goods_name} × ${quantity} 到门店${to_store_id}`,
      });

      // 4. 查找目标门店是否有同名商品
      const [targetGoods] = await connection.query(
        "SELECT * FROM goods WHERE goods_name = ? AND store_id = ? FOR UPDATE",
        [item.goods_name, to_store_id],
      );

      if (targetGoods.length > 0) {
        // 目标店有该商品，直接增加库存
        await connection.query(
          "UPDATE goods SET stock = stock + ? WHERE id = ?",
          [quantity, targetGoods[0].id],
        );

        // 👈 记录目标门店的库存流水（增加）
        await recordInventoryLog(connection, {
          goods_id: targetGoods[0].id,
          store_id: to_store_id,
          change_type: "调拨",
          change_quantity: quantity,
          before_stock: targetGoods[0].stock,
          after_stock: targetGoods[0].stock + quantity,
          operator_id: req.user.id,
          remark: `从门店${from_store_id} 调入 ${item.goods_name} × ${quantity}`,
        });
      } else {
        // 目标店没有该商品，自动新建
        const [insertResult] = await connection.query(
          "INSERT INTO goods(goods_name, category, spec, purchase_price, sell_price, unit, stock, warning_num, carbon_saving, store_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [
            item.goods_name,
            item.category,
            item.spec,
            item.purchase_price,
            item.sell_price,
            item.unit,
            quantity,
            item.warning_num,
            item.carbon_saving,
            to_store_id,
          ],
        );

        // 👈 记录新商品的库存流水
        await recordInventoryLog(connection, {
          goods_id: insertResult.insertId,
          store_id: to_store_id,
          change_type: "调拨",
          change_quantity: quantity,
          before_stock: 0,
          after_stock: quantity,
          operator_id: req.user.id,
          remark: `从门店${from_store_id} 调入 ${item.goods_name} × ${quantity}（新建商品）`,
        });
      }

      // 5. 记录审计日志
      await connection.query(
        "INSERT INTO audit_logs(user_id, action, details) VALUES (?, ?, ?)",
        [
          req.user.id,
          "跨店调拨",
          `执行调拨: ${item.goods_name} 从门店${from_store_id} 调拨 ${quantity}${item.unit} 到门店${to_store_id}`,
        ],
      );

      await connection.commit();
      res.json({ code: 200, msg: "调拨执行成功" });
    } catch (err) {
      await connection.rollback();
      console.error("调拨失败:", err);
      res.json({ code: 500, msg: "调拨失败: " + err.message });
    } finally {
      connection.release();
    }
  },
);

// ==================== 3. 获取调拨记录 ====================
router.get("/records", async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin" || req.user.role === "hq_leader";
    const userFilter = isAdmin ? "" : `AND u.store_id = ${req.user.store_id}`;

    const [rows] = await pool.query(`
      SELECT a.id, a.action, a.details, a.create_time, u.real_name as operator_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.action = '跨店调拨' ${userFilter}
      ORDER BY a.create_time DESC
      LIMIT 100
    `);
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error("获取调拨记录失败:", err);
    res.json({ code: 500, msg: "获取调拨记录失败" });
  }
});

module.exports = router;
