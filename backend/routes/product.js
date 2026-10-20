/**
 * 商品管理路由
 * 包含：列表、新增、编辑、入库、删除、批量删除、上下架、批量改价、导出
 */
const express = require("express");
const router = express.Router();
const pool = require("../db");
const ExcelJS = require("exceljs");
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
      "INSERT INTO goods(goods_name, category, spec, purchase_price, sell_price, unit, stock, warning_num, carbon_saving, store_id, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
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
        "on_sale",
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
    if (!quantity || quantity <= 0)
      return res.json({ code: 400, msg: "入库数量必须大于0" });

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
        goods_id,
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
    res.json({ code: 500, msg: "删除失败" });
  }
});

// ==================== 6. 批量删除 ====================
router.post(
  "/batch-delete",
  checkPermission("product:delete"),
  async (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0)
      return res.json({ code: 400, msg: "请选择要删除的商品" });

    try {
      await pool.query("DELETE FROM goods WHERE id IN (?)", [ids]);
      res.json({ code: 200, msg: `成功删除 ${ids.length} 个商品` });
    } catch (err) {
      console.error("批量删除失败:", err);
      res.json({ code: 500, msg: "批量删除失败: " + err.message });
    }
  },
);

// ==================== 7. 上下架停售 ====================
router.put("/:id/status", checkPermission("product:add"), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["on_sale", "off_sale"].includes(status)) {
    return res.json({ code: 400, msg: "状态值不合法" });
  }

  try {
    await pool.query("UPDATE goods SET status = ? WHERE id = ?", [status, id]);
    res.json({ code: 200, msg: status === "on_sale" ? "已上架" : "已下架" });
  } catch (err) {
    res.json({ code: 500, msg: "操作失败" });
  }
});

// ==================== 8. 批量改价 ====================
router.post(
  "/batch-price",
  checkPermission("product:add"),
  async (req, res) => {
    const { ids, adjustType, adjustValue } = req.body;
    // adjustType: 'increase' 加价 / 'decrease' 减价 / 'set' 直接设置
    // adjustValue: 数值或百分比

    if (!ids || ids.length === 0)
      return res.json({ code: 400, msg: "请选择要修改的商品" });
    if (!adjustType || adjustValue === undefined)
      return res.json({ code: 400, msg: "请填写调整参数" });

    try {
      let sql = "";
      let params = [];

      if (adjustType === "increase") {
        sql = "UPDATE goods SET sell_price = sell_price + ? WHERE id IN (?)";
        params = [adjustValue, ids];
      } else if (adjustType === "decrease") {
        sql =
          "UPDATE goods SET sell_price = GREATEST(0, sell_price - ?) WHERE id IN (?)";
        params = [adjustValue, ids];
      } else if (adjustType === "set") {
        sql = "UPDATE goods SET sell_price = ? WHERE id IN (?)";
        params = [adjustValue, ids];
      }

      await pool.query(sql, params);
      res.json({ code: 200, msg: `成功修改 ${ids.length} 个商品的价格` });
    } catch (err) {
      console.error("批量改价失败:", err);
      res.json({ code: 500, msg: "批量改价失败: " + err.message });
    }
  },
);

// ==================== 9. 导出商品清单 Excel ====================
router.get("/export", async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin" || req.user.role === "hq_leader";
    const storeFilter = isAdmin ? "" : `WHERE store_id = ${req.user.store_id}`;

    const [rows] = await pool.query(
      `SELECT * FROM goods ${storeFilter} ORDER BY id ASC`,
    );

    if (rows.length === 0) {
      return res.json({ code: 400, msg: "没有可导出的商品" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("商品清单");

    worksheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "商品名称", key: "goods_name", width: 25 },
      { header: "分类", key: "category", width: 15 },
      { header: "规格", key: "spec", width: 15 },
      { header: "进货价", key: "purchase_price", width: 12 },
      { header: "售价", key: "sell_price", width: 12 },
      { header: "单位", key: "unit", width: 10 },
      { header: "当前库存", key: "stock", width: 12 },
      { header: "预警值", key: "warning_num", width: 12 },
      { header: "碳减排(kg)", key: "carbon_saving", width: 14 },
      { header: "所属门店", key: "store_name", width: 12 },
      { header: "状态", key: "status_text", width: 10 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF003A70" },
    };
    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    rows.forEach((item) => {
      worksheet.addRow({
        id: item.id,
        goods_name: item.goods_name,
        category: item.category,
        spec: item.spec,
        purchase_price: item.purchase_price,
        sell_price: item.sell_price,
        unit: item.unit,
        stock: item.stock,
        warning_num: item.warning_num,
        carbon_saving: item.carbon_saving,
        store_name: item.store_id === 1 ? "A店" : "B店",
        status_text: item.status === "off_sale" ? "已下架" : "上架中",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=products.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("导出商品清单失败:", err);
    res.status(500).json({ code: 500, msg: "导出失败" });
  }
});

module.exports = router;
