/**
 * 业务单据模板组件
 * 包含：补货任务单、入库单（支持多行明细）
 * 用途：生成 PDF 打印
 */
import React from "react";

// ==================== 通用单据样式 ====================
const styles = {
  page: {
    padding: "15mm 12mm", // 👈 用 mm 单位，更精准
    fontFamily: '"SimSun", "Microsoft YaHei", Arial, sans-serif',
    color: "#000",
    background: "#fff",
    width: "210mm", // 👈 A4 宽度
    boxSizing: "border-box",
    // 👈 不设置 minHeight，让内容自适应，避免多出空白页
  },
  header: {
    textAlign: "center",
    borderBottom: "2px solid #003a70",
    paddingBottom: "10px",
    marginBottom: "16px",
  },
  companyName: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#003a70",
    letterSpacing: "2px",
    marginBottom: "4px",
  },
  systemName: {
    fontSize: "11px",
    color: "#666",
  },
  title: {
    fontSize: "18px",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: "16px",
    letterSpacing: "4px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
    fontSize: "12px",
    lineHeight: "1.8",
  },
  infoCol: {
    flex: 1,
    paddingRight: "10px",
  },
  infoLabel: {
    display: "inline-block",
    width: "80px",
    color: "#666",
  },
  infoValue: {
    fontWeight: "bold",
    borderBottom: "1px solid #999",
    paddingBottom: "2px",
    minWidth: "120px",
    display: "inline-block",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "8px",
    marginBottom: "16px",
    fontSize: "11px", // 👈 字体从 13px 缩到 11px
    tableLayout: "fixed", // 👈 固定表格布局，防止溢出
  },
  th: {
    background: "#003a70",
    color: "#fff",
    border: "1px solid #003a70",
    padding: "6px 4px",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "11px",
  },
  td: {
    border: "1px solid #999",
    padding: "5px 4px",
    textAlign: "center",
    fontSize: "11px",
    wordBreak: "break-all", // 👈 长文本自动换行
  },
  tdLeft: {
    border: "1px solid #999",
    padding: "5px 4px",
    textAlign: "left",
    fontSize: "11px",
    wordBreak: "break-all",
  },
  totalRow: {
    background: "#f0f7ff",
    fontWeight: "bold",
  },
  signRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "40px",
    fontSize: "12px",
  },
  signItem: {
    display: "flex",
    alignItems: "center",
  },
  signLine: {
    display: "inline-block",
    borderBottom: "1px solid #333",
    width: "100px",
    marginLeft: "6px",
  },
  footer: {
    marginTop: "20px",
    fontSize: "10px",
    color: "#999",
    textAlign: "right",
    borderTop: "1px solid #ddd",
    paddingTop: "6px",
  },
};

// ==================== 通用：生成单号 ====================
const genOrderNo = (prefix) => {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `${prefix}-${dateStr}-${timeStr}`;
};

// ==================== 通用：格式化时间 ====================
const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (e) {
    return timeStr;
  }
};

// ==================== 补货任务单（多行） ====================
export const ReplenishReport = ({ orders = [] }) => {
  if (!orders || orders.length === 0) return null;

  const firstOrder = orders[0];
  const storeName = firstOrder.store_id === 1 ? "A店" : "B店";
  const supplier = firstOrder.supplier || "待确认";
  const expectedDate = firstOrder.expected_date
    ? new Date(firstOrder.expected_date).toISOString().slice(0, 10)
    : "-";

  const totalQty = orders.reduce(
    (sum, item) => sum + (item.actual_quantity || item.suggest_quantity || 0),
    0,
  );

  const printTime = formatTime(new Date());

  const orderNo = firstOrder.order_no || genOrderNo("RO");

  return (
    <div style={styles.page} id="report-content">
      {/* 抬头 */}
      <div style={styles.header}>
        <div style={styles.companyName}>网络商店库存管理系统</div>
        <div style={styles.systemName}>
          Network Store Inventory Management System (NSIM-System)
        </div>
      </div>

      {/* 标题 */}
      <div style={styles.title}>补 货 任 务 单</div>

      {/* 基本信息 */}
      <div style={styles.infoRow}>
        <div style={styles.infoCol}>
          <div>
            <span style={styles.infoLabel}>补货单号：</span>
            <span style={styles.infoValue}>{orderNo}</span>
          </div>
          <div>
            <span style={styles.infoLabel}>创建时间：</span>
            <span style={styles.infoValue}>
              {formatTime(firstOrder.create_time)}
            </span>
          </div>
          <div>
            <span style={styles.infoLabel}>门店：</span>
            <span style={styles.infoValue}>{storeName}</span>
          </div>
        </div>
        <div style={styles.infoCol}>
          <div>
            <span style={styles.infoLabel}>供应商：</span>
            <span style={styles.infoValue}>{supplier}</span>
          </div>
          <div>
            <span style={styles.infoLabel}>预计到货：</span>
            <span style={styles.infoValue}>{expectedDate}</span>
          </div>
          <div>
            <span style={styles.infoLabel}>商品项数：</span>
            <span style={styles.infoValue}>{orders.length} 项</span>
          </div>
        </div>
      </div>

      {/* 明细表格 - 用固定列宽防止溢出 */}
      <table style={styles.table}>
        <colgroup>
          <col style={{ width: "6%" }} />
          <col style={{ width: "34%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={styles.th}>序号</th>
            <th style={styles.th}>商品名称</th>
            <th style={styles.th}>规格</th>
            <th style={styles.th}>单位</th>
            <th style={styles.th}>当前库存</th>
            <th style={styles.th}>补货数量</th>
            <th style={styles.th}>预警值</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((item, index) => (
            <tr key={item.id}>
              <td style={styles.td}>{index + 1}</td>
              <td style={styles.tdLeft}>{item.goods_name}</td>
              <td style={styles.td}>{item.spec || "-"}</td>
              <td style={styles.td}>{item.unit || "-"}</td>
              <td style={styles.td}>{item.stock ?? "-"}</td>
              <td
                style={{ ...styles.td, fontWeight: "bold", color: "#cf1322" }}
              >
                {item.actual_quantity || item.suggest_quantity}
              </td>
              <td style={styles.td}>{item.warning_num ?? "-"}</td>
            </tr>
          ))}
          <tr style={styles.totalRow}>
            <td colSpan={5} style={{ ...styles.td, textAlign: "right" }}>
              合计：
            </td>
            <td style={{ ...styles.td, color: "#cf1322" }}>{totalQty}</td>
            <td style={styles.td}>-</td>
          </tr>
        </tbody>
      </table>

      {/* 签字栏 */}
      <div style={styles.signRow}>
        <div style={styles.signItem}>
          申请人：<span style={styles.signLine}></span>
        </div>
        <div style={styles.signItem}>
          审批人：<span style={styles.signLine}></span>
        </div>
        <div style={styles.signItem}>
          供应商签收：<span style={styles.signLine}></span>
        </div>
      </div>

      {/* 页脚 */}
      <div style={styles.footer}>打印时间：{printTime}</div>
    </div>
  );
};

// ==================== 入库单（多行） ====================
export const StockInReport = ({ logs = [] }) => {
  if (!logs || logs.length === 0) return null;

  const firstLog = logs[0];
  const storeName = firstLog.store_id === 1 ? "A店" : "B店";
  const operator = firstLog.operator_name || "-";

  const totalQty = logs.reduce((sum, item) => sum + item.change_quantity, 0);

  const printTime = formatTime(new Date());

  const orderNo = genOrderNo("IN");

  return (
    <div style={styles.page} id="report-content">
      {/* 抬头 */}
      <div style={styles.header}>
        <div style={styles.companyName}>网络商店库存管理系统</div>
        <div style={styles.systemName}>
          Network Store Inventory Management System (NSIM-System)
        </div>
      </div>

      {/* 标题 */}
      <div style={styles.title}>入 库 单</div>

      {/* 基本信息 */}
      <div style={styles.infoRow}>
        <div style={styles.infoCol}>
          <div>
            <span style={styles.infoLabel}>入库单号：</span>
            <span style={styles.infoValue}>{orderNo}</span>
          </div>
          <div>
            <span style={styles.infoLabel}>入库时间：</span>
            <span style={styles.infoValue}>
              {formatTime(firstLog.create_time)}
            </span>
          </div>
          <div>
            <span style={styles.infoLabel}>门店：</span>
            <span style={styles.infoValue}>{storeName}</span>
          </div>
        </div>
        <div style={styles.infoCol}>
          <div>
            <span style={styles.infoLabel}>操作人：</span>
            <span style={styles.infoValue}>{operator}</span>
          </div>
          <div>
            <span style={styles.infoLabel}>商品项数：</span>
            <span style={styles.infoValue}>{logs.length} 项</span>
          </div>
          <div>
            <span style={styles.infoLabel}>状态：</span>
            <span
              style={{
                ...styles.infoValue,
                color: "#52c41a",
                borderBottom: "none",
              }}
            >
              已入库
            </span>
          </div>
        </div>
      </div>

      {/* 明细表格 - 8 列 */}
      <table style={styles.table}>
        <colgroup>
          <col style={{ width: "5%" }} />
          <col style={{ width: "28%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={styles.th}>序号</th>
            <th style={styles.th}>商品名称</th>
            <th style={styles.th}>规格</th>
            <th style={styles.th}>单位</th>
            <th style={styles.th}>入库数量</th>
            <th style={styles.th}>变动前</th>
            <th style={styles.th}>变动后</th>
            <th style={styles.th}>备注</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((item, index) => (
            <tr key={item.id}>
              <td style={styles.td}>{index + 1}</td>
              <td style={styles.tdLeft}>{item.goods_name}</td>
              <td style={styles.td}>{item.spec || "-"}</td>
              <td style={styles.td}>{item.unit || "-"}</td>
              <td
                style={{ ...styles.td, fontWeight: "bold", color: "#52c41a" }}
              >
                +{item.change_quantity}
              </td>
              <td style={styles.td}>{item.before_stock}</td>
              <td style={{ ...styles.td, fontWeight: "bold" }}>
                {item.after_stock}
              </td>
              <td style={styles.tdLeft}>{item.remark || "-"}</td>
            </tr>
          ))}
          <tr style={styles.totalRow}>
            <td colSpan={4} style={{ ...styles.td, textAlign: "right" }}>
              合计入库：
            </td>
            <td style={{ ...styles.td, color: "#52c41a" }}>+{totalQty}</td>
            <td colSpan={3} style={styles.td}>
              -
            </td>
          </tr>
        </tbody>
      </table>

      {/* 签字栏 */}
      <div style={styles.signRow}>
        <div style={styles.signItem}>
          收货人：<span style={styles.signLine}></span>
        </div>
        <div style={styles.signItem}>
          复核人：<span style={styles.signLine}></span>
        </div>
        <div style={styles.signItem}>
          仓库主管：<span style={styles.signLine}></span>
        </div>
      </div>

      {/* 页脚 */}
      <div style={styles.footer}>打印时间：{printTime}</div>
    </div>
  );
};
