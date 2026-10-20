/**
 * 智能补货页面
 * - 补货建议：勾选商品，一键补货 / 打印补货单
 * - 待处理任务：查看补货单状态，确认入库
 */
import React, { useState, useEffect } from "react";
import {
  Card,
  Tabs,
  Table,
  Tag,
  Button,
  message,
  Space,
  InputNumber,
  Popconfirm,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  ThunderboltOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { createRoot } from "react-dom/client";
import {
  getSuggestions,
  createReplenishOrder,
  getReplenishOrders,
  receiveReplenishOrder,
} from "../api/replenish";
import { ReplenishReport } from "../components/ReportTemplates";
import { generatePDF } from "../utils/printReport";

const Replenish = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "1";

  const [suggestions, setSuggestions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [editedQuantities, setEditedQuantities] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await getSuggestions();
      setSuggestions(res.data);
      const initQty = {};
      res.data.forEach((item) => {
        initQty[item.id] = item.suggest_quantity;
      });
      setEditedQuantities(initQty);
    } catch (error) {
      message.error("获取补货建议失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await getReplenishOrders();
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    fetchOrders();
  }, []);

  // ==================== 一键补货 ====================
  const handleBatchReplenish = async () => {
    if (selectedKeys.length === 0) return message.warning("请至少勾选一个商品");
    const items = selectedKeys.map((id) => {
      const item = suggestions.find((s) => s.id === id);
      return {
        goods_id: id,
        quantity: editedQuantities[id] || item.suggest_quantity,
        supplier: null,
        expected_date: dayjs().add(3, "day").format("YYYY-MM-DD"),
      };
    });
    try {
      await createReplenishOrder(items);
      message.success(`成功创建 ${items.length} 条补货任务`);
      setSelectedKeys([]);
      fetchSuggestions();
      fetchOrders();
    } catch (error) {
      message.error("创建补货任务失败");
    }
  };

  // ==================== 打印补货单（从补货建议处打印） ====================
  const handlePrintSuggestions = () => {
    if (selectedKeys.length === 0) {
      return message.warning("请至少勾选一条补货建议");
    }

    // 生成单号
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    const orderNo = `RO-${dateStr}-${timeStr}`;

    // 把补货建议数据转换成补货单格式
    const selectedItems = suggestions
      .filter((s) => selectedKeys.includes(s.id))
      .map((item) => ({
        ...item,
        actual_quantity: editedQuantities[item.id] || item.suggest_quantity,
        order_no: orderNo,
        supplier: "待确认",
        expected_date: dayjs().add(3, "day").format("YYYY-MM-DD"),
        create_time: new Date().toISOString(),
      }));

    const tempDiv = document.createElement("div");
    tempDiv.style.position = "fixed";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "0";
    document.body.appendChild(tempDiv);

    const root = createRoot(tempDiv);
    root.render(<ReplenishReport orders={selectedItems} />);

    setTimeout(() => {
      const element = tempDiv.querySelector("#report-content");
      generatePDF(element, `补货单_${orderNo}`);
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(tempDiv);
      }, 1000);
    }, 300);
  };

  // ==================== 确认入库 ====================
  const handleReceive = async (id) => {
    try {
      await receiveReplenishOrder(id);
      message.success("入库成功，库存已更新");
      fetchOrders();
    } catch (error) {
      message.error("入库失败");
    }
  };

  // ==================== 表格列 ====================
  const suggestionColumns = [
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
      width: 80,
    },
    {
      title: t("replenish.avg_daily_sales") || "日均销量",
      dataIndex: "avg_daily_sales",
      key: "avg_daily_sales",
      width: 100,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: t("replenish.rule_based_qty") || "规则补货量",
      dataIndex: "rule_based_qty",
      key: "rule_based_qty",
      width: 110,
      render: (text) => <Tag color="orange">{text}</Tag>,
    },
    {
      title: t("replenish.smart_based_qty") || "智能补货量",
      dataIndex: "smart_based_qty",
      key: "smart_based_qty",
      width: 110,
      render: (text) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: t("replenish.suggest_quantity") || "建议补货量",
      dataIndex: "suggest_quantity",
      key: "suggest_quantity",
      width: 110,
      render: (text) => <Tag color="green">{text}</Tag>,
    },
    {
      title: t("replenish.actual_quantity") || "实际补货量",
      key: "actual_quantity",
      width: 130,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={editedQuantities[record.id]}
          onChange={(val) => {
            if (!val || val <= 0) {
              setEditedQuantities({
                ...editedQuantities,
                [record.id]: record.suggest_quantity,
              });
              message.warning(
                t("replenish.warning_zero") || "补货量不能为0，已恢复为建议值",
              );
            } else {
              setEditedQuantities({ ...editedQuantities, [record.id]: val });
            }
          }}
          size="small"
          style={{ width: 100 }}
        />
      ),
    },
  ];

  const orderColumns = [
    {
      title: t("replenish.order_no") || "补货单号",
      dataIndex: "order_no",
      key: "order_no",
      width: 180,
    },
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
      title: t("replenish.actual_quantity") || "补货数量",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      width: 100,
    },
    {
      title: t("replenish.supplier") || "供应商",
      dataIndex: "supplier",
      key: "supplier",
      width: 140,
      render: (text) => text || "-",
    },
    {
      title: t("replenish.expected_date") || "预计到货",
      dataIndex: "expected_date",
      key: "expected_date",
      width: 110,
      render: (text) => (text ? dayjs(text).format("YYYY-MM-DD") : "-"),
    },
    {
      title: t("replenish.status") || "状态",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (text) => {
        const map = {
          pending: {
            color: "orange",
            label: t("replenish.status_pending") || "待处理",
            icon: <ClockCircleOutlined />,
          },
          ordered: {
            color: "blue",
            label: t("replenish.status_ordered") || "已下单",
            icon: <InboxOutlined />,
          },
          received: {
            color: "green",
            label: t("replenish.status_received") || "已入库",
            icon: <CheckCircleOutlined />,
          },
        };
        const cfg = map[text] || map.pending;
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: t("product.action") || "操作",
      key: "action",
      width: 130,
      render: (_, record) =>
        record.status !== "received" ? (
          <Popconfirm
            title={
              t("replenish.confirm_receive_tip") || "确认该补货单已到货并入库？"
            }
            onConfirm={() => handleReceive(record.id)}
            okText={t("replenish.ok") || "确认"}
            cancelText={t("replenish.cancel") || "取消"}
          >
            <Button type="link" size="small" icon={<CheckCircleOutlined />}>
              {t("replenish.confirm_receive") || "确认入库"}
            </Button>
          </Popconfirm>
        ) : (
          <span style={{ color: "#999" }}>
            {t("replenish.done") || "已完成"}
          </span>
        ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <Row gutter={8}>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("replenish.pending_products") || "待补货商品"}
              value={suggestions.length}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: "#cf1322", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("replenish.total_orders") || "补货任务单"}
              value={orders.length}
              prefix={<InboxOutlined />}
              valueStyle={{ color: "#1890ff", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("replenish.pending_orders") || "待处理"}
              value={orders.filter((o) => o.status === "pending").length}
              valueStyle={{ color: "#faad14", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" bodyStyle={{ padding: "8px 12px" }}>
            <Statistic
              title={t("replenish.received_orders") || "已入库"}
              value={orders.filter((o) => o.status === "received").length}
              valueStyle={{ color: "#3f8600", fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" bodyStyle={{ padding: 0 }}>
        <Tabs
          defaultActiveKey={tabParam}
          style={{ padding: "0 16px" }}
          items={[
            {
              key: "1",
              label: (
                <span>
                  <ThunderboltOutlined />{" "}
                  {t("replenish.tab_suggestions") || "补货建议"}
                </span>
              ),
              children: (
                <div>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={handleBatchReplenish}
                      disabled={selectedKeys.length === 0}
                    >
                      {t("replenish.batch_replenish") || "一键补货"} (
                      {selectedKeys.length})
                    </Button>
                    {/* 👈 打印按钮移到补货建议处 */}
                    <Button
                      type="primary"
                      icon={<PrinterOutlined />}
                      onClick={handlePrintSuggestions}
                      disabled={selectedKeys.length === 0}
                    >
                      {t("replenish.batch_print") || "打印补货单"} (
                      {selectedKeys.length})
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={fetchSuggestions}
                    >
                      {t("replenish.refresh") || "刷新"}
                    </Button>
                    <span style={{ color: "#888", fontSize: 12 }}>
                      {t("replenish.print_tip") ||
                        "提示：勾选多个商品，可合并成一张补货单打印"}
                    </span>
                  </Space>
                  <Table
                    key={i18n.language}
                    rowKey="id"
                    columns={suggestionColumns}
                    dataSource={suggestions}
                    loading={loading}
                    pagination={{ pageSize: 10, size: "small" }}
                    scroll={{ x: "max-content" }}
                    rowSelection={{
                      selectedRowKeys: selectedKeys,
                      onChange: setSelectedKeys,
                    }}
                  />
                </div>
              ),
            },
            {
              key: "2",
              // 👈 Tab 名称改为"待处理任务"
              label: (
                <span>
                  <InboxOutlined /> {t("replenish.tab_pending") || "待处理任务"}
                </span>
              ),
              children: (
                <div>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Button icon={<ReloadOutlined />} onClick={fetchOrders}>
                      {t("replenish.refresh") || "刷新"}
                    </Button>
                  </Space>
                  <Table
                    key={i18n.language}
                    rowKey="id"
                    columns={orderColumns}
                    dataSource={orders}
                    pagination={{ pageSize: 10, size: "small" }}
                    scroll={{ x: "max-content" }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Replenish;
