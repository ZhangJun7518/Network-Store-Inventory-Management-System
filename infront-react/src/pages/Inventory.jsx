/**
 * 库存管理主页面
 * Tab 顺序：仓库平面图 → 入库管理 → 出库管理 → 预警管理 → 库存流水
 */
import React, { useState, useEffect } from "react";
import {
  Card,
  Tabs,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
  Button,
  message,
  Space,
  Select,
  DatePicker,
  Modal,
  Form,
  InputNumber,
  Input,
} from "antd";
import {
  ImportOutlined,
  ExportOutlined,
  WarningOutlined,
  HistoryOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  PlusOutlined,
  ScanOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  getInventoryLogs,
  getInventoryStats,
  exportInventoryLogs,
} from "../api/inventory";
import { getSuggestions } from "../api/replenish";
import { getProductList, stockIn } from "../api/product";
import WarehouseMap from "../components/WarehouseMap";

const { RangePicker } = DatePicker;

const Inventory = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    todayInbound: 0,
    todayOutbound: 0,
    todayTransfer: 0,
  });
  const [warnings, setWarnings] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  const [stockInModalVisible, setStockInModalVisible] = useState(false);
  const [stockInForm] = Form.useForm();

  // ==================== 数据请求 ====================
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.change_type = filterType;
      if (dateRange && dateRange[0])
        params.start_date = dateRange[0].format("YYYY-MM-DD");
      if (dateRange && dateRange[1])
        params.end_date = dateRange[1].format("YYYY-MM-DD");
      const res = await getInventoryLogs(params);
      setLogs(res.data);
    } catch (error) {
      message.error("获取库存流水失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const clientTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      const res = await getInventoryStats(clientTime);
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWarnings = async () => {
    try {
      const res = await getSuggestions();
      setWarnings(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await getProductList();
      setProducts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchWarnings();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filterType, dateRange]);

  // ==================== 新增入库 ====================
  const handleStockIn = async (values) => {
    try {
      const product = products.find((p) => p.id === Number(values.goods_id));
      if (!product) {
        return message.error("商品ID不存在，请检查");
      }
      await stockIn({
        goods_id: Number(values.goods_id),
        quantity: values.quantity,
      });
      message.success(`${product.goods_name} 入库成功`);
      setStockInModalVisible(false);
      stockInForm.resetFields();
      fetchLogs();
      fetchStats();
      fetchProducts();
    } catch (error) {
      message.error("入库失败");
    }
  };

  // ==================== 占位功能 ====================
  const showDevTip = (featureName) => {
    message.info(`${featureName} - 功能开发中，敬请期待`);
  };

  // ==================== 导出库存流水 ====================
  const handleExportLogs = async () => {
    try {
      const params = {};
      if (filterType) params.change_type = filterType;
      const res = await exportInventoryLogs(params);
      const blob = new Blob([res], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `库存流水_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("导出成功");
    } catch (error) {
      message.error("导出失败");
    }
  };

  // ==================== 表格列 ====================
  const logColumns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: t("product.name") || "商品名称",
      dataIndex: "goods_name",
      key: "goods_name",
    },
    {
      title: t("product.spec") || "规格",
      dataIndex: "spec",
      key: "spec",
      width: 100,
    },
    {
      title: t("inventory.change_type") || "变动类型",
      dataIndex: "change_type",
      key: "change_type",
      width: 100,
      render: (text) => {
        const colorMap = {
          入库: "green",
          销售: "red",
          调拨: "blue",
          盘点: "orange",
        };
        return <Tag color={colorMap[text] || "default"}>{text}</Tag>;
      },
    },
    {
      title: t("inventory.change_quantity") || "变动数量",
      dataIndex: "change_quantity",
      key: "change_quantity",
      width: 100,
      render: (text) => (
        <span style={{ color: text > 0 ? "green" : "red", fontWeight: "bold" }}>
          {text > 0 ? `+${text}` : text}
        </span>
      ),
    },
    {
      title: t("inventory.before_stock") || "变动前",
      dataIndex: "before_stock",
      key: "before_stock",
      width: 80,
    },
    {
      title: t("inventory.after_stock") || "变动后",
      dataIndex: "after_stock",
      key: "after_stock",
      width: 80,
    },
    {
      title: t("inventory.operator") || "操作人",
      dataIndex: "operator_name",
      key: "operator_name",
      width: 100,
    },
    {
      title: t("inventory.remark") || "备注",
      dataIndex: "remark",
      key: "remark",
      ellipsis: true,
    },
    {
      title: t("inventory.time") || "时间",
      dataIndex: "create_time",
      key: "create_time",
      width: 160,
      render: (text) => (text ? dayjs(text).format("YYYY-MM-DD HH:mm") : "-"),
    },
  ];

  const warningColumns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: t("product.name") || "商品名称",
      dataIndex: "goods_name",
      key: "goods_name",
    },
    {
      title: t("product.spec") || "规格",
      dataIndex: "spec",
      key: "spec",
      width: 100,
    },
    {
      title: t("product.stock") || "当前库存",
      dataIndex: "stock",
      key: "stock",
      width: 100,
      render: (text) => (
        <span style={{ color: "red", fontWeight: "bold" }}>{text}</span>
      ),
    },
    {
      title: t("product.warning") || "预警值",
      dataIndex: "warning_num",
      key: "warning_num",
      width: 100,
    },
    {
      title: t("replenish.avg_daily_sales") || "日均销量",
      dataIndex: "avg_daily_sales",
      key: "avg_daily_sales",
      width: 100,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: t("replenish.suggest_quantity") || "建议补货量",
      dataIndex: "suggest_quantity",
      key: "suggest_quantity",
      width: 120,
      render: (text) => <Tag color="green">{text}</Tag>,
    },
  ];

  const inboundLogs = logs.filter((log) => log.change_type === "入库");
  const outboundLogs = logs.filter((log) => log.change_type === "销售");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* 顶部统计卡片 */}
      <Row gutter={8}>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("inventory.today_inbound") || "今日入库"}
              value={stats.todayInbound}
              prefix={<ImportOutlined />}
              valueStyle={{ color: "#3f8600", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("inventory.today_outbound") || "今日出库"}
              value={stats.todayOutbound}
              prefix={<ExportOutlined />}
              valueStyle={{ color: "#cf1322", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("inventory.today_transfer") || "今日调拨"}
              value={stats.todayTransfer}
              prefix={<HistoryOutlined />}
              valueStyle={{ color: "#1890ff", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("inventory.warning_count") || "库存预警数"}
              value={warnings.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: "#faad14", fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" bodyStyle={{ padding: 0 }}>
        <Tabs
          defaultActiveKey="map"
          style={{ padding: "0 16px" }}
          items={[
            {
              key: "map",
              label: (
                <span>
                  <AppstoreOutlined /> {t("inventory.tab_map") || "仓库平面图"}
                </span>
              ),
              children: (
                <div style={{ padding: "16px 0" }}>
                  <WarehouseMap goods={products} />
                </div>
              ),
            },
            {
              key: "inbound",
              label: (
                <span>
                  <ImportOutlined /> {t("inventory.tab_inbound") || "入库管理"}
                </span>
              ),
              children: (
                <div style={{ paddingBottom: 16 }}>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setStockInModalVisible(true)}
                    >
                      {t("inventory.btn_new_inbound") || "新增入库"}
                    </Button>
                    <Button
                      icon={<ScanOutlined />}
                      onClick={() => showDevTip("扫码入库")}
                    >
                      {t("inventory.btn_scan_inbound") || "扫码入库"}
                    </Button>
                    <Button
                      icon={<ImportOutlined />}
                      onClick={() => showDevTip("批量入库")}
                    >
                      {t("inventory.btn_batch_inbound") || "批量入库"}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleExportLogs}
                    >
                      {t("inventory.btn_export") || "导出记录"}
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
                      {t("inventory.refresh") || "刷新"}
                    </Button>
                  </Space>
                  <Table
                    key={i18n.language}
                    rowKey="id"
                    columns={logColumns}
                    dataSource={inboundLogs}
                    loading={loading}
                    pagination={{ pageSize: 10, size: "small" }}
                    scroll={{ x: "max-content" }}
                  />
                </div>
              ),
            },
            {
              key: "outbound",
              label: (
                <span>
                  <ExportOutlined /> {t("inventory.tab_outbound") || "出库管理"}
                </span>
              ),
              children: (
                <div style={{ paddingBottom: 16 }}>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Button
                      type="primary"
                      icon={<ScanOutlined />}
                      onClick={() => navigate("/sales")}
                    >
                      {t("inventory.btn_scan_outbound") || "扫码出库"}
                    </Button>
                    <Button
                      icon={<ExportOutlined />}
                      onClick={() => showDevTip("批量出库")}
                    >
                      {t("inventory.btn_batch_outbound") || "批量出库"}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleExportLogs}
                    >
                      {t("inventory.btn_export") || "导出记录"}
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
                      {t("inventory.refresh") || "刷新"}
                    </Button>
                  </Space>
                  <Table
                    key={i18n.language}
                    rowKey="id"
                    columns={logColumns}
                    dataSource={outboundLogs}
                    loading={loading}
                    pagination={{ pageSize: 10, size: "small" }}
                    scroll={{ x: "max-content" }}
                  />
                </div>
              ),
            },
            {
              key: "warning",
              label: (
                <span>
                  <WarningOutlined /> {t("inventory.tab_warning") || "预警管理"}
                </span>
              ),
              children: (
                <div style={{ paddingBottom: 16 }}>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={() => navigate("/replenish")}
                    >
                      {t("inventory.btn_one_click_replenish") || "一键补货"}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => showDevTip("导出预警清单")}
                    >
                      {t("inventory.btn_export_warning") || "导出预警清单"}
                    </Button>
                    <Button
                      icon={<SettingOutlined />}
                      onClick={() => showDevTip("批量设置预警值")}
                    >
                      {t("inventory.btn_batch_warning") || "批量设置预警值"}
                    </Button>
                    <Button
                      icon={<CloseCircleOutlined />}
                      onClick={() => showDevTip("忽略本次预警")}
                    >
                      {t("inventory.btn_ignore_warning") || "忽略本次预警"}
                    </Button>
                  </Space>
                  <Table
                    key={i18n.language}
                    rowKey="id"
                    columns={warningColumns}
                    dataSource={warnings}
                    pagination={{ pageSize: 10, size: "small" }}
                    scroll={{ x: "max-content" }}
                  />
                </div>
              ),
            },
            {
              key: "logs",
              label: (
                <span>
                  <HistoryOutlined /> {t("inventory.tab_logs") || "库存流水"}
                </span>
              ),
              children: (
                <div style={{ paddingBottom: 16 }}>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Select
                      placeholder={t("inventory.change_type") || "变动类型"}
                      allowClear
                      style={{ width: 120 }}
                      size="small"
                      onChange={setFilterType}
                      options={[
                        {
                          value: "入库",
                          label: t("inventory.type_inbound") || "入库",
                        },
                        {
                          value: "销售",
                          label: t("inventory.type_sales") || "销售",
                        },
                        {
                          value: "调拨",
                          label: t("inventory.type_transfer") || "调拨",
                        },
                      ]}
                    />
                    <RangePicker size="small" onChange={setDateRange} />
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={fetchLogs}
                      size="small"
                    >
                      {t("inventory.refresh") || "刷新"}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleExportLogs}
                      size="small"
                    >
                      {t("inventory.btn_export") || "导出记录"}
                    </Button>
                  </Space>
                  <Table
                    key={i18n.language}
                    rowKey="id"
                    columns={logColumns}
                    dataSource={logs}
                    loading={loading}
                    pagination={{ pageSize: 10, size: "small" }}
                    scroll={{ x: "max-content" }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 新增入库弹窗 */}
      <Modal
        title={t("inventory.btn_new_inbound") || "新增入库"}
        open={stockInModalVisible}
        onOk={() => stockInForm.submit()}
        onCancel={() => setStockInModalVisible(false)}
        okText={t("inventory.confirm") || "确认入库"}
        cancelText={t("inventory.cancel") || "取消"}
      >
        <Form form={stockInForm} layout="vertical" onFinish={handleStockIn}>
          <Form.Item
            name="goods_id"
            label={t("inventory.goods_id") || "商品ID"}
            rules={[{ required: true, message: "请输入商品ID" }]}
          >
            <Input type="number" placeholder="例如: 3" />
          </Form.Item>
          <Form.Item
            name="quantity"
            label={t("inventory.quantity") || "入库数量"}
            rules={[{ required: true, message: "请输入入库数量" }]}
          >
            <InputNumber
              min={1}
              style={{ width: "100%" }}
              placeholder="例如: 50"
            />
          </Form.Item>
          <div style={{ color: "#888", fontSize: 12 }}>
            {t("inventory.inbound_tip") ||
              "提示：商品ID 可在“商品管理”页面查看"}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;
