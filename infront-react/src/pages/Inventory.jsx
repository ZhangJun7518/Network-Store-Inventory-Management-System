/**
 * 库存管理主页面
 * - 管理员/店长：显示全部 Tab（仓库平面图、入库、出库、预警、流水）
 * - 理货员：只显示（入库、出库、我的操作记录），且只看自己的操作
 * - 入库管理支持多选批量打印 PDF
 */
import React, { useState, useEffect, useRef } from "react";
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
  Radio,
  Alert,
  Descriptions,
} from "antd";
import {
  ImportOutlined,
  ExportOutlined,
  WarningOutlined,
  HistoryOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  ScanOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { createRoot } from "react-dom/client";
import {
  getInventoryLogs,
  getInventoryStats,
  exportInventoryLogs,
} from "../api/inventory";
import { getSuggestions } from "../api/replenish";
import { getProductList, stockIn } from "../api/product";
import { checkout } from "../api/sales";
import WarehouseMap from "../components/WarehouseMap";
import { StockInReport } from "../components/ReportTemplates";
import { generatePDF } from "../utils/printReport";

const { RangePicker } = DatePicker;

const Inventory = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isStocker = userInfo.role === "stocker";

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
  const [stockOutModalVisible, setStockOutModalVisible] = useState(false);
  const [stockInForm] = Form.useForm();
  const [stockOutForm] = Form.useForm();

  const [scannedInboundProduct, setScannedInboundProduct] = useState(null);
  const [scannedOutboundProduct, setScannedOutboundProduct] = useState(null);

  const inboundQtyRef = useRef(null);
  const outboundQtyRef = useRef(null);

  // 👈 批量打印入库单
  const [selectedInboundKeys, setSelectedInboundKeys] = useState([]);
  const [selectedInboundRecords, setSelectedInboundRecords] = useState([]);

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
    if (!isStocker) fetchWarnings();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filterType, dateRange]);

  const handleInboundGoodsIdChange = (e) => {
    const id = Number(e.target.value);
    if (!id) {
      setScannedInboundProduct(null);
      return;
    }
    const product = products.find((p) => p.id === id);
    if (product) {
      setScannedInboundProduct(product);
      setTimeout(() => {
        inboundQtyRef.current?.focus();
      }, 100);
    } else {
      setScannedInboundProduct(null);
    }
  };

  const handleOutboundGoodsIdChange = (e) => {
    const id = Number(e.target.value);
    if (!id) {
      setScannedOutboundProduct(null);
      return;
    }
    const product = products.find((p) => p.id === id);
    if (product) {
      setScannedOutboundProduct(product);
      setTimeout(() => {
        outboundQtyRef.current?.focus();
      }, 100);
    } else {
      setScannedOutboundProduct(null);
    }
  };

  const handleStockIn = async (values) => {
    try {
      if (!scannedInboundProduct) return message.error("商品ID不存在，请检查");
      await stockIn({
        goods_id: scannedInboundProduct.id,
        quantity: values.quantity,
      });
      message.success(
        `${scannedInboundProduct.goods_name} ${t("inventory.inbound_success") || "入库成功"}`,
      );
      setStockInModalVisible(false);
      stockInForm.resetFields();
      setScannedInboundProduct(null);
      fetchLogs();
      fetchStats();
      fetchProducts();
    } catch (error) {
      message.error("入库失败");
    }
  };

  const handleStockOut = async (values) => {
    try {
      if (!scannedOutboundProduct) return message.error("商品ID不存在，请检查");
      if (scannedOutboundProduct.stock < values.quantity) {
        return message.error(
          `库存不足，当前库存 ${scannedOutboundProduct.stock}`,
        );
      }
      await checkout({
        goods_id: scannedOutboundProduct.id,
        quantity: values.quantity,
      });
      message.success(
        `${scannedOutboundProduct.goods_name} ${t("inventory.outbound_success") || "出库成功"}`,
      );
      setStockOutModalVisible(false);
      stockOutForm.resetFields();
      setScannedOutboundProduct(null);
      fetchLogs();
      fetchStats();
      fetchProducts();
    } catch (error) {
      message.error("出库失败");
    }
  };

  const showDevTip = (featureName) => {
    message.info(`${featureName} - 功能开发中，敬请期待`);
  };

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

  // 👈 批量打印入库单（合并成一张 PDF，多行明细）
  const handleBatchPrintStockIn = () => {
    if (selectedInboundRecords.length === 0) {
      return message.warning("请至少勾选一条入库记录");
    }

    const tempDiv = document.createElement("div");
    tempDiv.style.position = "fixed";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "0";
    document.body.appendChild(tempDiv);

    const root = createRoot(tempDiv);
    root.render(<StockInReport logs={selectedInboundRecords} />);

    setTimeout(() => {
      const element = tempDiv.querySelector("#report-content");
      generatePDF(element, `入库单_${new Date().getTime()}`);
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(tempDiv);
      }, 1000);
    }, 300);
  };

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

  // 👈 理货员只看自己的操作
  const displayLogs = isStocker
    ? logs.filter((log) => log.operator_id === userInfo.id)
    : logs;

  const inboundLogs = displayLogs.filter((log) => log.change_type === "入库");
  const outboundLogs = displayLogs.filter((log) => log.change_type === "销售");

  const renderProductCard = (product) => {
    if (!product) return null;
    return (
      <div
        style={{
          background: "#f0f7ff",
          padding: "12px",
          borderRadius: 6,
          marginBottom: 12,
          border: "1px solid #bae0ff",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: "bold",
            color: "#003a70",
            marginBottom: 8,
          }}
        >
          {product.goods_name}
        </div>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label={t("product.spec") || "规格"}>
            {product.spec || "-"}
          </Descriptions.Item>
          <Descriptions.Item label={t("product.unit") || "单位"}>
            {product.unit || "-"}
          </Descriptions.Item>
          <Descriptions.Item label={t("product.stock") || "库存"}>
            <span
              style={{
                color: product.stock <= product.warning_num ? "red" : "green",
                fontWeight: "bold",
              }}
            >
              {product.stock}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={t("product.price") || "售价"}>
            ¥{Number(product.sell_price).toFixed(2)}
          </Descriptions.Item>
        </Descriptions>
      </div>
    );
  };

  const tabsItems = [
    ...(!isStocker
      ? [
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
        ]
      : []),

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
              icon={<ScanOutlined />}
              onClick={() => {
                setScannedInboundProduct(null);
                stockInForm.resetFields();
                setStockInModalVisible(true);
              }}
            >
              {t("inventory.btn_scan_inbound") || "扫码入库"}
            </Button>
            {!isStocker && (
              <>
                <Button
                  icon={<ImportOutlined />}
                  onClick={() => showDevTip("批量入库")}
                >
                  {t("inventory.btn_batch_inbound") || "批量入库"}
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleExportLogs}>
                  {t("inventory.btn_export") || "导出记录"}
                </Button>
              </>
            )}
            {/* 👈 批量打印按钮 */}
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handleBatchPrintStockIn}
              disabled={selectedInboundKeys.length === 0}
            >
              {t("inventory.batch_print") || "批量打印"} (
              {selectedInboundKeys.length})
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
            rowSelection={{
              selectedRowKeys: selectedInboundKeys,
              onChange: (keys, rows) => {
                setSelectedInboundKeys(keys);
                setSelectedInboundRecords(rows);
              },
            }}
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
              onClick={() => {
                setScannedOutboundProduct(null);
                stockOutForm.resetFields();
                setStockOutModalVisible(true);
              }}
            >
              {t("inventory.btn_scan_outbound") || "扫码出库"}
            </Button>
            {!isStocker && (
              <>
                <Button
                  icon={<ExportOutlined />}
                  onClick={() => showDevTip("批量出库")}
                >
                  {t("inventory.btn_batch_outbound") || "批量出库"}
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleExportLogs}>
                  {t("inventory.btn_export") || "导出记录"}
                </Button>
              </>
            )}
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

    ...(!isStocker
      ? [
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
        ]
      : []),

    {
      key: "logs",
      label: (
        <span>
          <HistoryOutlined />{" "}
          {isStocker
            ? t("inventory.my_records") || "我的操作记录"
            : t("inventory.tab_logs") || "库存流水"}
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
                { value: "入库", label: t("inventory.type_inbound") || "入库" },
                { value: "销售", label: t("inventory.type_sales") || "销售" },
                {
                  value: "调拨",
                  label: t("inventory.type_transfer") || "调拨",
                },
              ]}
            />
            <RangePicker size="small" onChange={setDateRange} />
            <Button icon={<ReloadOutlined />} onClick={fetchLogs} size="small">
              {t("inventory.refresh") || "刷新"}
            </Button>
            {!isStocker && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportLogs}
                size="small"
              >
                {t("inventory.btn_export") || "导出记录"}
              </Button>
            )}
          </Space>
          <Table
            key={i18n.language}
            rowKey="id"
            columns={logColumns}
            dataSource={displayLogs}
            loading={loading}
            pagination={{ pageSize: 10, size: "small" }}
            scroll={{ x: "max-content" }}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
          defaultActiveKey={isStocker ? "inbound" : "map"}
          style={{ padding: "0 16px" }}
          items={tabsItems}
        />
      </Card>

      {/* 扫码入库弹窗 */}
      <Modal
        title={
          <span>
            <ScanOutlined /> {t("inventory.scan_inbound_title") || "扫码入库"}
          </span>
        }
        open={stockInModalVisible}
        onOk={() => stockInForm.submit()}
        onCancel={() => {
          setStockInModalVisible(false);
          setScannedInboundProduct(null);
        }}
        okText={t("inventory.confirm") || "确认入库"}
        cancelText={t("inventory.cancel") || "取消"}
        okButtonProps={{ disabled: !scannedInboundProduct }}
      >
        <Alert
          message={
            t("inventory.scan_hint") ||
            "请输入商品ID，或将光标置于输入框中，用扫码枪扫描商品条码"
          }
          type="info"
          showIcon
          style={{ marginBottom: 12, fontSize: 12 }}
        />
        <Form form={stockInForm} layout="vertical" onFinish={handleStockIn}>
          <Form.Item
            name="goods_id"
            label={t("inventory.goods_id") || "商品ID"}
            rules={[{ required: true }]}
          >
            <Input
              type="number"
              placeholder="例如: 3"
              autoFocus
              onChange={handleInboundGoodsIdChange}
              onPressEnter={() => {
                if (scannedInboundProduct) inboundQtyRef.current?.focus();
              }}
            />
          </Form.Item>
          {scannedInboundProduct && renderProductCard(scannedInboundProduct)}
          {stockInForm.getFieldValue("goods_id") && !scannedInboundProduct && (
            <Alert
              message="商品ID不存在，请检查"
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}
          <Form.Item
            name="quantity"
            label={t("inventory.quantity") || "入库数量"}
            rules={[{ required: true }]}
          >
            <InputNumber
              ref={inboundQtyRef}
              min={1}
              style={{ width: "100%" }}
              placeholder="例如: 50"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 扫码出库弹窗 */}
      <Modal
        title={
          <span>
            <ScanOutlined /> {t("inventory.scan_outbound_title") || "扫码出库"}
          </span>
        }
        open={stockOutModalVisible}
        onOk={() => stockOutForm.submit()}
        onCancel={() => {
          setStockOutModalVisible(false);
          setScannedOutboundProduct(null);
        }}
        okText={t("inventory.confirm") || "确认出库"}
        cancelText={t("inventory.cancel") || "取消"}
        okButtonProps={{ disabled: !scannedOutboundProduct }}
      >
        <Alert
          message={
            t("inventory.scan_hint") ||
            "请输入商品ID，或将光标置于输入框中，用扫码枪扫描商品条码"
          }
          type="info"
          showIcon
          style={{ marginBottom: 12, fontSize: 12 }}
        />
        <Form
          form={stockOutForm}
          layout="vertical"
          onFinish={handleStockOut}
          initialValues={{ reason: "sales" }}
        >
          <Form.Item
            name="goods_id"
            label={t("inventory.goods_id") || "商品ID"}
            rules={[{ required: true }]}
          >
            <Input
              type="number"
              placeholder="例如: 3"
              autoFocus
              onChange={handleOutboundGoodsIdChange}
              onPressEnter={() => {
                if (scannedOutboundProduct) outboundQtyRef.current?.focus();
              }}
            />
          </Form.Item>
          {scannedOutboundProduct && renderProductCard(scannedOutboundProduct)}
          {stockOutForm.getFieldValue("goods_id") &&
            !scannedOutboundProduct && (
              <Alert
                message="商品ID不存在，请检查"
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
          <Form.Item
            name="quantity"
            label={t("inventory.quantity") || "出库数量"}
            rules={[{ required: true }]}
          >
            <InputNumber
              ref={outboundQtyRef}
              min={1}
              max={scannedOutboundProduct?.stock || 999999}
              style={{ width: "100%" }}
              placeholder="例如: 1"
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label={t("inventory.outbound_reason") || "出库原因"}
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Radio value="sales">
                {t("inventory.reason_sales") || "销售"}
              </Radio>
              <Radio value="loss">{t("inventory.reason_loss") || "损耗"}</Radio>
              <Radio value="return">
                {t("inventory.reason_return") || "退货"}
              </Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;
