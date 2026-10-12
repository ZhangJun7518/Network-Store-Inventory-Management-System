/**
 * 库存管理路由
 * 包含：库存流水查询、库存变动统计、库存导出、记录库存变动
 */
const express = require("express");
const router = express.Router();
const pool = require("../db");
const ExcelJS = require("exceljs");

router.use(require("../middlewares/auth"));

// ==================== 1. 获取库存流水 ====================
router.get("/logs", async (req, res) => {
  try {
    const { goods_id, change_type, start_date, end_date } = req.query;
    const isAdmin = req.user.role === "admin" || req.user.role === "hq_leader";

    let sql = `
      SELECT 
        il.*,
        DATE_FORMAT(il.create_time, '%Y-%m-%d %H:%i:%s') as create_time_str,
        g.goods_name,
        g.spec,
        g.unit,
        u.real_name as operator_name
      FROM inventory_logs il
      LEFT JOIN goods g ON il.goods_id = g.id
      LEFT JOIN users u ON il.operator_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      sql += " AND il.store_id = ?";
      params.push(req.user.store_id);
    }

    if (goods_id) {
      sql += " AND il.goods_id = ?";
      params.push(goods_id);
    }
    if (change_type) {
      sql += " AND il.change_type = ?";
      params.push(change_type);
    }
    if (start_date) {
      sql += " AND il.create_time >= ?";
      params.push(start_date);
    }
    if (end_date) {
      sql += " AND il.create_time <= ?";
      params.push(end_date);
    }

    sql += " ORDER BY il.create_time DESC LIMIT 200";

    const [rows] = await pool.query(sql, params);
    const formattedRows = rows.map((row) => ({
      ...row,
      create_time: row.create_time_str,
    }));
    res.json({ code: 200, data: formattedRows });
  } catch (err) {
    console.error("获取库存流水失败:", err);
    res.json({ code: 500, msg: "获取库存流水失败" });
  }
});

// ==================== 2. 获取库存变动统计 ====================
router.get("/stats", async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin" || req.user.role === "hq_leader";
    const storeAnd = isAdmin ? "" : `AND store_id = ${req.user.store_id}`;

    const clientTime =
      req.query.client_time ||
      new Date().toISOString().slice(0, 19).replace("T", " ");
    const today = clientTime.slice(0, 10);

    const [inbound] = await pool.query(
      `
      SELECT IFNULL(SUM(change_quantity), 0) as total 
      FROM inventory_logs 
      WHERE change_type = '入库' 
      AND DATE(create_time) = ? ${storeAnd}
    `,
      [today],
    );

    const [outbound] = await pool.query(
      `
      SELECT IFNULL(SUM(ABS(change_quantity)), 0) as total 
      FROM inventory_logs 
      WHERE change_type = '销售' 
      AND DATE(create_time) = ? ${storeAnd}
    `,
      [today],
    );

    const [transfer] = await pool.query(
      `
      SELECT COUNT(*) as total 
      FROM inventory_logs 
      WHERE change_type = '调拨' 
      AND DATE(create_time) = ? ${storeAnd}
    `,
      [today],
    );

    res.json({
      code: 200,
      data: {
        todayInbound: inbound[0].total,
        todayOutbound: outbound[0].total,
        todayTransfer: transfer[0].total,
      },
    });
  } catch (err) {
    console.error("获取库存统计失败:", err);
    res.json({ code: 500, msg: "获取库存统计失败" });
  }
});

// ==================== 3. 导出库存流水 Excel ====================
router.get("/export-logs", async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin" || req.user.role === "hq_leader";
    const storeFilter = isAdmin ? "" : `AND il.store_id = ${req.user.store_id}`;
    const { change_type } = req.query;

    let typeFilter = "";
    if (change_type) typeFilter = ` AND il.change_type = '${change_type}'`;

    const [rows] = await pool.query(`
      SELECT 
        il.id,
        g.goods_name,
        g.spec,
        g.unit,
        il.change_type,
        il.change_quantity,
        il.before_stock,
        il.after_stock,
        u.real_name as operator_name,
        il.remark,
        DATE_FORMAT(il.create_time, '%Y-%m-%d %H:%i:%s') as create_time_str
      FROM inventory_logs il
      LEFT JOIN goods g ON il.goods_id = g.id
      LEFT JOIN users u ON il.operator_id = u.id
      WHERE 1=1 ${storeFilter} ${typeFilter}
      ORDER BY il.create_time DESC
      LIMIT 1000
    `);

    if (rows.length === 0) {
      return res.json({ code: 400, msg: "没有可导出的记录" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("库存流水");

    worksheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "商品名称", key: "goods_name", width: 25 },
      { header: "规格", key: "spec", width: 15 },
      { header: "单位", key: "unit", width: 10 },
      { header: "变动类型", key: "change_type", width: 12 },
      { header: "变动数量", key: "change_quantity", width: 12 },
      { header: "变动前", key: "before_stock", width: 10 },
      { header: "变动后", key: "after_stock", width: 10 },
      { header: "操作人", key: "operator_name", width: 12 },
      { header: "备注", key: "remark", width: 30 },
      { header: "时间", key: "create_time_str", width: 20 },
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

    rows.forEach((item) => worksheet.addRow(item));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventory_logs.xlsx",
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("导出库存流水失败:", err);
    res.status(500).json({ code: 500, msg: "导出失败" });
  }
});

// ==================== 4. 记录库存变动（内部调用） ====================
const recordInventoryLog = async (
  connection,
  {
    goods_id,
    store_id,
    change_type,
    change_quantity,
    before_stock,
    after_stock,
    reference_id = null,
    operator_id,
    remark = null,
  },
) => {
  await connection.query(
    `INSERT INTO inventory_logs 
     (goods_id, store_id, change_type, change_quantity, before_stock, after_stock, reference_id, operator_id, remark) 
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      goods_id,
      store_id,
      change_type,
      change_quantity,
      before_stock,
      after_stock,
      reference_id,
      operator_id,
      remark,
    ],
  );
};

module.exports = router;
module.exports.recordInventoryLog = recordInventoryLog;
