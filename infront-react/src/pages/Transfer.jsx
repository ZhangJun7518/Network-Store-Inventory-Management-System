/**
 * 智能调拨页面
 * 包含：跨门店库存查看、发起调拨申请、调拨记录查看（从审计日志提取）
 * 调拨记录支持编辑、撤销（占位）
 */
import React, { useState, useEffect } from "react";
import {
  Table,
  Card,
  Button,
  Tag,
  message,
  Row,
  Col,
  Modal,
  Form,
  Select,
  InputNumber,
  Tabs,
  Space,
  Popconfirm,
} from "antd";
import {
  SwapOutlined,
  HistoryOutlined,
  EditOutlined,
  UndoOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  getTransferResources,
  executeTransfer,
  getTransferRecords,
} from "../api/transfer";
import { useTranslation } from "react-i18next";

const Transfer = () => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getTransferResources();
      setData(res.data);
    } catch (error) {
      message.error("获取资源失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      const res = await getTransferRecords();
      setRecords(res.data);
    } catch (error) {
      console.error("获取调拨记录失败", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchRecords();
  }, []);

  const handleOpenModal = (record) => {
    setCurrentRecord(record);
    setIsModalOpen(true);
    form.setFieldsValue({
      to_store_id: record.store_id === 1 ? 2 : 1,
      quantity: 1,
    });
  };

  const handleTransfer = async (values) => {
    try {
      await executeTransfer({
        from_store_id: currentRecord.store_id,
        to_store_id: values.to_store_id,
        goods_id: currentRecord.id,
        quantity: values.quantity,
      });
      message.success(t("transfer.success") || "调拨执行成功！库存已更新");
      setIsModalOpen(false);
      fetchData();
      fetchRecords();
    } catch (error) {
      console.error(error);
    }
  };

  // ==================== 占位功能 ====================
  const showDevTip = (featureName) => {
    message.info(
      `${featureName} - ${t("system.dev_tip") || "功能开发中，敬请期待..."}`,
    );
  };

  // 库存列表列
  const columns = [
    {
      title: t("transfer.product") || "商品名称",
      dataIndex: "goods_name",
      key: "goods_name",
    },
    {
      title: t("transfer.category") || "分类",
      dataIndex: "category",
      key: "category",
      render: (text) => <Tag color="blue">{t(`category.${text}`) || text}</Tag>,
    },
    {
      title: t("transfer.store") || "所属门店",
      dataIndex: "store_id",
      key: "store_id",
      render: (text) => (
        <Tag color={text === 1 ? "blue" : "green"}>
          {text === 1 ? "A店" : "B店"}
        </Tag>
      ),
    },
    {
      title: t("transfer.stock") || "当前库存",
      dataIndex: "stock",
      key: "stock",
      render: (text) => <span style={{ fontWeight: "bold" }}>{text}</span>,
    },
    {
      title: t("transfer.action") || "操作",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<SwapOutlined />}
          onClick={() => handleOpenModal(record)}
        >
          {t("transfer.apply") || "发起调拨"}
        </Button>
      ),
    },
  ];

  // 调拨记录列（👈 新增编辑和撤销按钮）
  const recordColumns = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    {
      title: t("transfer.operator") || "操作人",
      dataIndex: "operator_name",
      key: "operator_name",
      width: 100,
    },
    {
      title: t("transfer.detail") || "调拨详情",
      dataIndex: "details",
      key: "details",
    },
    {
      title: t("transfer.time") || "操作时间",
      dataIndex: "create_time",
      key: "create_time",
      width: 180,
    },
    {
      title: t("transfer.action") || "操作",
      key: "action",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showDevTip(t("transfer.edit") || "编辑调拨")}
          >
            {t("transfer.edit") || "编辑"}
          </Button>
          <Popconfirm
            title={
              t("transfer.cancel_confirm") ||
              "确定要撤销这条调拨记录吗？撤销后库存将恢复。"
            }
            onConfirm={() =>
              showDevTip(t("transfer.cancel_transfer") || "撤销调拨")
            }
            okText={t("transfer.ok") || "确定"}
            cancelText={t("transfer.cancel") || "取消"}
          >
            <Button type="link" size="small" danger icon={<UndoOutlined />}>
              {t("transfer.cancel_transfer") || "撤销调拨"}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Row gutter={16} style={{ height: "100%", overflow: "hidden" }}>
      <Col span={24} style={{ height: "100%" }}>
        <Card
          bordered={false}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
          bodyStyle={{ flex: 1, overflow: "hidden", padding: 0 }}
        >
          <Tabs
            defaultActiveKey="1"
            style={{ height: "100%" }}
            items={[
              {
                key: "1",
                label: t("transfer.tab_apply") || "发起调拨",
                children: (
                  <div style={{ paddingBottom: 16 }}>
                    <Space style={{ marginBottom: 12, paddingLeft: 16 }}>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchData}
                        size="small"
                      >
                        {t("inventory.refresh") || "刷新"}
                      </Button>
                    </Space>
                    <Table
                      key={i18n.language}
                      rowKey="id"
                      columns={columns}
                      dataSource={data}
                      loading={loading}
                      pagination={{ pageSize: 10, size: "small" }}
                      scroll={{ x: "max-content" }}
                    />
                  </div>
                ),
              },
              {
                key: "2",
                label: (
                  <span>
                    <HistoryOutlined /> {t("transfer.tab_record") || "调拨记录"}
                  </span>
                ),
                children: (
                  <div style={{ paddingBottom: 16 }}>
                    <Space style={{ marginBottom: 12, paddingLeft: 16 }}>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchRecords}
                        size="small"
                      >
                        {t("inventory.refresh") || "刷新"}
                      </Button>
                    </Space>
                    <Table
                      key={i18n.language}
                      rowKey="id"
                      columns={recordColumns}
                      dataSource={records}
                      pagination={{ pageSize: 10, size: "small" }}
                      scroll={{ x: "max-content" }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </Col>

      {/* 调拨弹窗 */}
      <Modal
        title={`${t("transfer.modal_title") || "发起调拨 - "}${currentRecord?.goods_name || ""}`}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        okText={t("transfer.confirm") || "确认调拨"}
        cancelText={t("transfer.cancel") || "取消"}
      >
        <Form form={form} layout="vertical" onFinish={handleTransfer}>
          <Form.Item label={t("transfer.from_store") || "来源门店"}>
            <InputNumber
              value={currentRecord?.store_id}
              disabled
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item
            name="to_store_id"
            label={t("transfer.to_store") || "目标门店"}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 1, label: "A店" },
                { value: 2, label: "B店" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label={t("transfer.quantity") || "调拨数量"}
            rules={[{ required: true }]}
          >
            <InputNumber
              min={1}
              max={currentRecord?.stock || 1}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <div style={{ color: "#888", fontSize: "12px" }}>
            {t("transfer.tip") ||
              "* 如果目标门店没有该商品，系统将自动在目标门店创建该商品并增加库存。"}
          </div>
        </Form>
      </Modal>
    </Row>
  );
};

export default Transfer;
