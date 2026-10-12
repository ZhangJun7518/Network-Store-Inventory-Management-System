import React, { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Table, Tag, message } from "antd";
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  CloudOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  InboxOutlined,
  SwapOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import {
  getDashboardStats,
  getDashboardTrend,
  getDashboardCategory,
  getDashboardWarnings,
  getTurnover,
  getTodos,
  getRecentSales,
} from "../api/dashboard";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState({
    goodsCount: 0,
    todaySales: 0,
    todayCarbon: 0,
    warningCount: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [turnover, setTurnover] = useState({
    salesCost: 0,
    stockValue: 0,
    turnoverRate: 0,
    turnoverDays: 0,
  });
  const [todos, setTodos] = useState({
    pendingReplenish: 0,
    pendingReceive: 0,
    pendingTransfer: 0,
    todaySalesCount: 0,
  });
  const [recentSales, setRecentSales] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const clientTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      const [
        resStats,
        resTrend,
        resCategory,
        resWarnings,
        resTurnover,
        resTodos,
        resRecent,
      ] = await Promise.all([
        getDashboardStats(clientTime),
        getDashboardTrend(clientTime),
        getDashboardCategory(),
        getDashboardWarnings(),
        getTurnover(clientTime),
        getTodos(clientTime),
        getRecentSales(),
      ]);
      setStats(resStats.data);
      setTrendData(resTrend.data);
      setCategoryData(resCategory.data);
      setWarnings(resWarnings.data);
      setTurnover(resTurnover.data);
      setTodos(resTodos.data);
      setRecentSales(resRecent.data);

      if (resWarnings.data.length > 0) {
        message.warning(
          `⚠️ ${resWarnings.data.length} ${t("dashboard.pending_replenish") || "个商品需要补货"}`,
        );
      }
    } catch (error) {
      message.error("数据获取失败");
    }
  };

  const lineOption = {
    title: {
      text: t("dashboard.trend_title") || "近7日销售趋势",
      left: "center",
      top: 5,
      textStyle: { color: "#003a70", fontSize: 13 },
    },
    tooltip: { trigger: "axis", confine: true },
    grid: { top: 50, right: 30, bottom: 30, left: 45 },
    xAxis: {
      type: "category",
      data: trendData.map((item) => item.date),
      axisLabel: { fontSize: 10, interval: 0 },
    },
    yAxis: { type: "value", axisLabel: { fontSize: 10 } },
    series: [
      {
        data: trendData.map((item) => item.sales),
        type: "line",
        smooth: true,
        label: { show: true, position: "top", fontSize: 10, formatter: "{c}" },
        areaStyle: { color: "rgba(0, 58, 112, 0.1)" },
        lineStyle: { color: "#003a70", width: 2 },
        itemStyle: { color: "#003a70" },
        animationDuration: 1500,
      },
    ],
  };

  const pieOption = {
    title: {
      text: t("dashboard.category_title") || "分类库存占比",
      left: "center",
      top: 5,
      textStyle: { color: "#003a70", fontSize: 13 },
    },
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: "55%",
        center: ["50%", "55%"],
        label: { show: true, formatter: "{b}: {c}", fontSize: 10 },
        data: categoryData.map((item) => ({
          value: item.value,
          name: item.name,
        })),
        animationDuration: 1500,
      },
    ],
  };

  const warningColumns = [
    {
      title: t("product.name") || "商品名称",
      dataIndex: "goods_name",
      key: "goods_name",
      ellipsis: true,
    },
    {
      title: t("product.stock") || "库存",
      dataIndex: "stock",
      key: "stock",
      width: 70,
      render: (text) => (
        <span style={{ color: "red", fontWeight: "bold" }}>{text}</span>
      ),
    },
    {
      title: t("dashboard.suggest_quantity") || "建议补货",
      dataIndex: "suggest_quantity",
      key: "suggest_quantity",
      width: 90,
      render: (text) => <Tag color="green">{text}</Tag>,
    },
  ];

  const salesColumns = [
    {
      title: t("product.name") || "商品",
      dataIndex: "goods_name",
      key: "goods_name",
      ellipsis: true,
    },
    {
      title: t("product.quantity") || "数量",
      dataIndex: "quantity",
      key: "quantity",
      width: 60,
      render: (text, record) => (
        <span>
          {text}
          {record.unit || ""}
        </span>
      ),
    },
    {
      title: "¥",
      dataIndex: "total_price",
      key: "total_price",
      width: 80,
      render: (text) => (
        <span style={{ color: "#cf1322" }}>¥{Number(text).toFixed(2)}</span>
      ),
    },
    {
      title: t("product.sale_time") || "时间",
      dataIndex: "sale_time_str",
      key: "sale_time_str",
      width: 100,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* 第一行：核心指标 */}
      <Row gutter={8}>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("dashboard.total_goods") || "总商品数"}
              value={stats.goodsCount}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: "#003a70", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("dashboard.today_sales") || "今日销售额 (¥)"}
              value={stats.todaySales}
              precision={2}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: "#3f8600", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("dashboard.today_carbon") || "今日碳减排 (kg)"}
              value={stats.todayCarbon}
              precision={2}
              prefix={<CloudOutlined />}
              valueStyle={{ color: "#1890ff", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("dashboard.warning_count") || "库存预警数"}
              value={stats.warningCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: "#cf1322", fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 第二行：效率指标 */}
      <Row gutter={8}>
        <Col span={8}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("dashboard.turnover_rate") || "库存周转率（近30天）"}
              value={turnover.turnoverRate}
              suffix={i18n.language === "zh" ? "次" : ""}
              valueStyle={{ color: "#1890ff", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("dashboard.turnover_days") || "周转天数"}
              value={turnover.turnoverDays}
              suffix={i18n.language === "zh" ? "天" : "d"}
              valueStyle={{ color: "#faad14", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("dashboard.stock_value") || "库存总价值"}
              value={turnover.stockValue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: "#3f8600", fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 第三行：智能调度台 */}
      <Card
        size="small"
        title={
          <span style={{ fontSize: 15, fontWeight: "bold", color: "#003a70" }}>
            ⚡ {t("dashboard.smart_dispatch") || "智能调度台"}
          </span>
        }
        bodyStyle={{ padding: "12px 16px" }}
        style={{
          background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)",
        }}
      >
        <Row gutter={[12, 12]}>
          <Col span={6}>
            <Card
              className="todo-card warning"
              size="small"
              hoverable
              onClick={() => (window.location.href = "/replenish")}
              style={{ cursor: "pointer" }}
              bodyStyle={{ padding: "12px" }}
            >
              <Statistic
                title={
                  <span>
                    <ThunderboltOutlined />{" "}
                    {t("dashboard.pending_replenish") || "待补货"}
                  </span>
                }
                value={todos.pendingReplenish}
                suffix={i18n.language === "zh" ? "项" : ""}
                valueStyle={{ color: "#faad14", fontSize: 22 }}
              />
              <div className="todo-link">
                {t("dashboard.go_process") || "去处理"} →
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card
              className="todo-card info"
              size="small"
              hoverable
              onClick={() => (window.location.href = "/replenish?tab=2")}
              style={{ cursor: "pointer" }}
              bodyStyle={{ padding: "12px" }}
            >
              <Statistic
                title={
                  <span>
                    <InboxOutlined />{" "}
                    {t("dashboard.pending_receive") || "待确认入库"}
                  </span>
                }
                value={todos.pendingReceive}
                suffix={i18n.language === "zh" ? "单" : ""}
                valueStyle={{ color: "#1890ff", fontSize: 22 }}
              />
              <div className="todo-link">
                {t("dashboard.go_process") || "去处理"} →
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card
              className="todo-card purple"
              size="small"
              hoverable
              onClick={() => (window.location.href = "/transfer")}
              style={{ cursor: "pointer" }}
              bodyStyle={{ padding: "12px" }}
            >
              <Statistic
                title={
                  <span>
                    <SwapOutlined />{" "}
                    {t("dashboard.pending_transfer") || "待调拨"}
                  </span>
                }
                value={todos.pendingTransfer}
                suffix={i18n.language === "zh" ? "项" : ""}
                valueStyle={{ color: "#722ed1", fontSize: 22 }}
              />
              <div className="todo-link">
                {t("dashboard.go_process") || "去处理"} →
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card
              className="todo-card success"
              size="small"
              hoverable
              onClick={() => (window.location.href = "/product?tab=2")}
              style={{ cursor: "pointer" }}
              bodyStyle={{ padding: "12px" }}
            >
              <Statistic
                title={
                  <span>
                    <ShoppingCartOutlined />{" "}
                    {t("dashboard.today_sales_count") || "今日销售"}
                  </span>
                }
                value={todos.todaySalesCount}
                suffix={i18n.language === "zh" ? "笔" : ""}
                valueStyle={{ color: "#52c41a", fontSize: 22 }}
              />
              <div className="todo-link">
                {t("dashboard.go_view") || "去查看"} →
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 第四行：图表 */}
      <Row gutter={8} style={{ height: "200px" }}>
        <Col span={16}>
          <Card
            size="small"
            style={{ height: "100%" }}
            bodyStyle={{ height: "100%", padding: 4 }}
          >
            <ReactECharts option={lineOption} style={{ height: "100%" }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            size="small"
            style={{ height: "100%" }}
            bodyStyle={{ height: "100%", padding: 4 }}
          >
            <ReactECharts option={pieOption} style={{ height: "100%" }} />
          </Card>
        </Col>
      </Row>

      {/* 第五行：底部两个表格 */}
      <Row gutter={8}>
        <Col span={12}>
          <Card
            size="small"
            title={
              <span>
                🤖 {t("dashboard.replenish_top5") || "智能补货建议（Top 5）"}
              </span>
            }
            extra={
              <a
                onClick={() => (window.location.href = "/replenish")}
                style={{ color: "#1890ff" }}
              >
                {t("dashboard.view_all") || "查看全部"} →
              </a>
            }
            bodyStyle={{ padding: 0 }}
          >
            <Table
              key={i18n.language}
              rowKey="id"
              columns={warningColumns}
              dataSource={warnings}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card
            size="small"
            title={
              <span>
                <HistoryOutlined />{" "}
                {t("dashboard.recent_sales_top5") || "最近销售记录（Top 5）"}
              </span>
            }
            extra={
              <a
                onClick={() => (window.location.href = "/product?tab=2")}
                style={{ color: "#1890ff" }}
              >
                {t("dashboard.view_all") || "查看全部"} →
              </a>
            }
            bodyStyle={{ padding: 0 }}
          >
            <Table
              key={i18n.language}
              rowKey="id"
              columns={salesColumns}
              dataSource={recentSales}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
