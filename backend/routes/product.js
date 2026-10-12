/**
 * 商品管理路由
 * 包含：获取商品列表、新增商品、编辑商品、商品入库、删除商品
 * 入库时会自动记录库存流水
 */
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { checkPermission } = require("../middlewares/auth");
const { recordInventoryLog } = require("./inventory");

router.use(require("../middlewares/auth"));

// ==================== 1. 获取商品列表 ====================
router.get("/list", async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin" || req.user.role === "hq_leader";
    const storeFilter = isAdmin ? "" : `WHERE store_id = ${req.user.store_id}`;
    const [rows] = await pool.query(
      `SELECT * FROM goods ${storeFilter} ORDER BY id DESC`,
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error("获取商品列表失败:", err);
    res.json({ code: 500, msg: "获取商品列表失败" });
  }
});

// ==================== 2. 新增商品 ====================
router.post("/", checkPermission("product:add"), async (req, res) => {
  const {
    goods_name,
    category,
    spec,
    purchase_price,
    sell_price,
    unit,
    stock,
    warning_num,
    carbon_saving,
    store_id,
  } = req.body;

  try {
    await pool.query(
      "INSERT INTO goods(goods_name, category, spec, purchase_price, sell_price, unit, stock, warning_num, carbon_saving, store_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        goods_name,
        category,
        spec,
        purchase_price,
        sell_price,
        unit,
        stock,
        warning_num,
        carbon_saving,
        store_id || req.user.store_id,
      ],
    );
    res.json({ code: 200, msg: "添加成功" });
  } catch (err) {
    console.error("新增商品失败:", err);
    res.json({ code: 500, msg: "添加失败: " + err.message });
  }
});

// ==================== 3. 编辑商品 ====================
router.put("/:id", checkPermission("product:add"), async (req, res) => {
  const { id } = req.params;
  const {
    goods_name,
    category,
    spec,
    purchase_price,
    sell_price,
    unit,
    warning_num,
    carbon_saving,
  } = req.body;

  try {
    await pool.query(
      "UPDATE goods SET goods_name=?, category=?, spec=?, purchase_price=?, sell_price=?, unit=?, warning_num=?, carbon_saving=? WHERE id=?",
      [
        goods_name,
        category,
        spec,
        purchase_price,
        sell_price,
        unit,
        warning_num,
        carbon_saving,
        id,
      ],
    );
    res.json({ code: 200, msg: "编辑成功" });
  } catch (err) {
    console.error("编辑商品失败:", err);
    res.json({ code: 500, msg: "编辑失败: " + err.message });
  }
});

// ==================== 4. 商品入库 ====================
router.post(
  "/stock-in",
  checkPermission("product:stock_in"),
  async (req, res) => {
    const { goods_id, quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.json({ code: 400, msg: "入库数量必须大于0" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [goods] = await connection.query(
        "SELECT * FROM goods WHERE id = ? FOR UPDATE",
        [goods_id],
      );
      if (goods.length === 0) throw new Error("商品不存在");
      const item = goods[0];

      await connection.query(
        "UPDATE goods SET stock = stock + ? WHERE id = ?",
        [quantity, goods_id],
      );

      await recordInventoryLog(connection, {
        goods_id: goods_id,
        store_id: item.store_id,
        change_type: "入库",
        change_quantity: quantity,
        before_stock: item.stock,
        after_stock: item.stock + quantity,
        operator_id: req.user.id,
        remark: `商品入库 ${quantity}${item.unit}`,
      });

      await connection.query(
        "INSERT INTO audit_logs(user_id, action, details) VALUES (?, ?, ?)",
        [
          req.user.id,
          "商品入库",
          `商品 ${item.goods_name} 入库 ${quantity}${item.unit}`,
        ],
      );

      await connection.commit();
      res.json({ code: 200, msg: "入库成功" });
    } catch (err) {
      await connection.rollback();
      console.error("商品入库失败:", err);
      res.json({ code: 500, msg: "入库失败: " + err.message });
    } finally {
      connection.release();
    }
  },
);

// ==================== 5. 删除商品 ====================
router.delete("/:id", checkPermission("product:delete"), async (req, res) => {
  try {
    await pool.query("DELETE FROM goods WHERE id = ?", [req.params.id]);
    res.json({ code: 200, msg: "删除成功" });
  } catch (err) {
    console.error("删除商品失败:", err);
    res.json({ code: 500, msg: "删除失败" });
  }
});

module.exports = router;
