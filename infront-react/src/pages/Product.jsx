/**
 * 商品管理页面
 * 支持：列表、新增、编辑、入库、删除、批量删除、上下架、批量改价、导出
 */
import React, { useState, useEffect } from "react";
import {
  Table,
  Card,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Tag,
  Tabs,
  Button,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  QrcodeOutlined,
  ImportOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DollarOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  getProductList,
  addProduct,
  deleteProduct,
  stockIn,
  updateProduct,
  batchDeleteProducts,
  updateProductStatus,
  batchUpdatePrice,
  exportProducts,
} from "../api/product";
import { getSalesList } from "../api/sales";
import AuthButton from "../components/AuthButton";
import { useTranslation } from "react-i18next";

const Product = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchKeyword = searchParams.get("search") || "";
  const tabParam = searchParams.get("tab") || "1";

  const [data, setData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isBatchPriceOpen, setIsBatchPriceOpen] = useState(false);
  const [currentGoods, setCurrentGoods] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [stockInForm] = Form.useForm();
  const [batchPriceForm] = Form.useForm();
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getProductList();
      setData(res.data);
    } catch (error) {
      message.error("获取商品列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await getSalesList();
      setSalesData(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSales();
  }, []);

  const handleAdd = async (values) => {
    try {
      if (userInfo.role === "store_manager")
        values.store_id = userInfo.store_id;
      await addProduct(values);
      message.success("添加成功");
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error("添加失败");
    }
  };

  const handleEdit = async (values) => {
    try {
      await updateProduct(currentGoods.id, values);
      message.success("编辑成功");
      setIsEditModalOpen(false);
      editForm.resetFields();
      fetchData();
    } catch (error) {
      message.error("编辑失败");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      message.success("删除成功");
      fetchData();
    } catch (error) {
      message.error("删除失败");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return message.warning("请先勾选商品");
    try {
      await batchDeleteProducts(selectedRowKeys);
      message.success(`成功删除 ${selectedRowKeys.length} 个商品`);
      setSelectedRowKeys([]);
      fetchData();
    } catch (error) {
      message.error("批量删除失败");
    }
  };

  const handleStockIn = async (values) => {
    try {
      await stockIn({ goods_id: currentGoods.id, quantity: values.quantity });
      message.success("入库成功");
      setIsStockInOpen(false);
      stockInForm.resetFields();
      fetchData();
    } catch (error) {
      message.error("入库失败");
    }
  };

  const handleToggleStatus = async (record) => {
    try {
      const newStatus = record.status === "off_sale" ? "on_sale" : "off_sale";
      await updateProductStatus(record.id, newStatus);
      message.success(newStatus === "on_sale" ? "已上架" : "已下架");
      fetchData();
    } catch (error) {
      message.error("操作失败");
    }
  };

  const handleBatchPrice = async (values) => {
    if (selectedRowKeys.length === 0) return message.warning("请先勾选商品");
    try {
      await batchUpdatePrice({
        ids: selectedRowKeys,
        adjustType: values.adjustType,
        adjustValue: values.adjustValue,
      });
      message.success(`成功修改 ${selectedRowKeys.length} 个商品的价格`);
      setIsBatchPriceOpen(false);
      batchPriceForm.resetFields();
      setSelectedRowKeys([]);
      fetchData();
    } catch (error) {
      message.error("批量改价失败");
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportProducts();
      const blob = new Blob([res], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `商品清单_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("导出成功");
    } catch (error) {
      message.error("导出失败");
    }
  };

  const openEditModal = (record) => {
    setCurrentGoods(record);
    editForm.setFieldsValue(record);
    setIsEditModalOpen(true);
  };

  const productColumns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: t("product.name") || "商品名称",
      dataIndex: "goods_name",
      key: "goods_name",
    },
    {
      title: t("product.category") || "分类",
      dataIndex: "category",
      key: "category",
      render: (text) => <Tag color="blue">{t(`category.${text}`) || text}</Tag>,
    },
    { title: t("product.spec") || "规格", dataIndex: "spec", key: "spec" },
    {
      title: t("product.price") || "售价 (¥)",
      dataIndex: "sell_price",
      key: "sell_price",
      render: (text) => Number(text).toFixed(2),
    },
    {
      title: t("product.stock") || "当前库存",
      dataIndex: "stock",
      key: "stock",
      render: (text, record) => (
        <span
          style={{
            color: text <= record.warning_num ? "red" : "green",
            fontWeight: "bold",
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: t("product.warning") || "预警值",
      dataIndex: "warning_num",
      key: "warning_num",
    },
    {
      title: t("product.carbon") || "碳减排(kg)",
      dataIndex: "carbon_saving",
      key: "carbon_saving",
    },
    {
      title: t("product.store") || "所属门店",
      dataIndex: "store_id",
      key: "store_id",
      render: (text) => (text === 1 ? "A店" : "B店"),
    },
    {
      title: t("product.status") || "状态",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (text) =>
        text === "off_sale" ? (
          <Tag color="red">{t("product.status_off") || "已下架"}</Tag>
        ) : (
          <Tag color="green">{t("product.status_on") || "上架中"}</Tag>
        ),
    },
    {
      title: t("product.action") || "操作",
      key: "action",
      width: 260,
      render: (_, record) => (
        <Space size="small">
          <AuthButton
            permission="product:stock_in"
            type="link"
            size="small"
            icon={<ImportOutlined />}
            onClick={() => {
              setCurrentGoods(record);
              setIsStockInOpen(true);
            }}
          >
            {t("product.stock_in") || "入库"}
          </AuthButton>
          <AuthButton
            permission="product:add"
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            {t("product.edit") || "编辑"}
          </AuthButton>
          <AuthButton
            permission="product:add"
            type="link"
            size="small"
            icon={
              record.status === "off_sale" ? (
                <CheckCircleOutlined />
              ) : (
                <StopOutlined />
              )
            }
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === "off_sale"
              ? t("product.on_sale") || "上架"
              : t("product.off_sale") || "下架"}
          </AuthButton>
          <Button
            type="link"
            size="small"
            icon={<QrcodeOutlined />}
            onClick={() => message.info("正在生成条码...")}
          >
            {t("product.barcode") || "条码"}
          </Button>
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <AuthButton
              permission="product:delete"
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              {t("product.delete") || "删除"}
            </AuthButton>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const salesColumns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: t("product.name") || "商品名称",
      dataIndex: "goods_name",
      key: "goods_name",
    },
    { title: "销售数量", dataIndex: "quantity", key: "quantity" },
    {
      title: "销售总额 (¥)",
      dataIndex: "total_price",
      key: "total_price",
      render: (text) => Number(text).toFixed(2),
    },
    {
      title: "碳减排量 (kg)",
      dataIndex: "carbon_saving_total",
      key: "carbon_saving_total",
    },
    {
      title: "销售时间",
      dataIndex: "sale_time",
      key: "sale_time",
      render: (text) => {
        if (!text) return "-";
        if (typeof text === "string" && text.includes("-"))
          return text.replace("T", " ").substring(0, 19);
        return new Date(text).toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      },
    },
    {
      title: t("product.store") || "所属门店",
      dataIndex: "store_id",
      key: "store_id",
      render: (text) => (text === 1 ? "A店" : "B店"),
    },
  ];

  const displayData = searchKeyword
    ? data.filter((item) => item.goods_name.includes(searchKeyword))
    : data;

  return (
    <Card bordered={false}>
      <Tabs
        defaultActiveKey={tabParam}
        items={[
          {
            key: "1",
            label: t("product.list") || "商品列表",
            children: (
              <>
                <Space style={{ marginBottom: 16 }} wrap>
                  <AuthButton
                    permission="product:add"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsModalOpen(true)}
                  >
                    {t("product.add") || "新增商品"}
                  </AuthButton>
                  <AuthButton
                    permission="product:delete"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleBatchDelete}
                    disabled={selectedRowKeys.length === 0}
                  >
                    {t("product.batch_delete") || "批量删除"} (
                    {selectedRowKeys.length})
                  </AuthButton>
                  <AuthButton
                    permission="product:add"
                    icon={<DollarOutlined />}
                    onClick={() => setIsBatchPriceOpen(true)}
                    disabled={selectedRowKeys.length === 0}
                  >
                    {t("product.batch_price") || "批量改价"} (
                    {selectedRowKeys.length})
                  </AuthButton>
                  <Button icon={<DownloadOutlined />} onClick={handleExport}>
                    {t("product.export") || "导出商品清单"}
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={fetchData}>
                    {t("inventory.refresh") || "刷新"}
                  </Button>
                  {searchKeyword && (
                    <Tag
                      color="blue"
                      style={{ padding: "4px 8px", fontSize: 14 }}
                    >
                      正在筛选：<strong>{searchKeyword}</strong>
                      <a
                        onClick={() => navigate("/product")}
                        style={{ marginLeft: 8, color: "#1890ff" }}
                      >
                        清除
                      </a>
                    </Tag>
                  )}
                </Space>
                <Table
                  key={i18n.language}
                  rowKey="id"
                  columns={productColumns}
                  dataSource={displayData}
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: "max-content" }}
                  rowSelection={{
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                  }}
                />
              </>
            ),
          },
          {
            key: "2",
            label: t("product.sales_record") || "销售记录",
            children: (
              <Table
                key={i18n.language}
                rowKey="id"
                columns={salesColumns}
                dataSource={salesData}
                pagination={{ pageSize: 10 }}
                scroll={{ x: "max-content" }}
              />
            ),
          },
        ]}
      />

      {/* 新增商品弹窗 */}
      <Modal
        title={t("product.add") || "新增商品"}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item
            name="goods_name"
            label={t("product.name") || "商品名称"}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="category"
            label={t("product.category") || "分类"}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="spec" label={t("product.spec") || "规格"}>
            <Input />
          </Form.Item>
          <Form.Item name="purchase_price" label="进货价">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item
            name="sell_price"
            label={t("product.price") || "售价"}
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input />
          </Form.Item>
          <Form.Item
            name="stock"
            label={t("product.stock") || "初始库存"}
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item
            name="warning_num"
            label={t("product.warning") || "预警数量"}
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item
            name="carbon_saving"
            label={t("product.carbon") || "碳减排系数(kg/件)"}
          >
            <InputNumber style={{ width: "100%" }} min={0} step={0.1} />
          </Form.Item>
          {userInfo.role === "admin" && (
            <Form.Item
              name="store_id"
              label={t("product.store") || "所属门店"}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 1, label: "A店" },
                  { value: 2, label: "B店" },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 编辑商品弹窗 */}
      <Modal
        title={t("product.edit") || "编辑商品"}
        open={isEditModalOpen}
        onOk={() => editForm.submit()}
        onCancel={() => setIsEditModalOpen(false)}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item
            name="goods_name"
            label={t("product.name") || "商品名称"}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="category"
            label={t("product.category") || "分类"}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="spec" label={t("product.spec") || "规格"}>
            <Input />
          </Form.Item>
          <Form.Item name="purchase_price" label="进货价">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item
            name="sell_price"
            label={t("product.price") || "售价"}
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input />
          </Form.Item>
          <Form.Item
            name="warning_num"
            label={t("product.warning") || "预警数量"}
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item
            name="carbon_saving"
            label={t("product.carbon") || "碳减排系数(kg/件)"}
          >
            <InputNumber style={{ width: "100%" }} min={0} step={0.1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 入库弹窗 */}
      <Modal
        title={`${t("product.stock_in") || "入库"} - ${currentGoods?.goods_name || ""}`}
        open={isStockInOpen}
        onOk={() => stockInForm.submit()}
        onCancel={() => setIsStockInOpen(false)}
      >
        <Form form={stockInForm} layout="vertical" onFinish={handleStockIn}>
          <Form.Item label={t("product.stock") || "当前库存"}>
            <InputNumber
              value={currentGoods?.stock}
              disabled
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label={t("product.stock_in") || "入库数量"}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量改价弹窗 */}
      <Modal
        title={t("product.batch_price_title") || "批量改价"}
        open={isBatchPriceOpen}
        onOk={() => batchPriceForm.submit()}
        onCancel={() => setIsBatchPriceOpen(false)}
      >
        <p style={{ color: "#888", fontSize: 12 }}>
          {t("product.selected_count", { count: selectedRowKeys.length }) ||
            `已选择 ${selectedRowKeys.length} 项`}
        </p>
        <Form
          form={batchPriceForm}
          layout="vertical"
          onFinish={handleBatchPrice}
          initialValues={{ adjustType: "set" }}
        >
          <Form.Item
            name="adjustType"
            label={t("product.adjust_type") || "调整方式"}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                {
                  value: "increase",
                  label: t("product.adjust_increase") || "加价",
                },
                {
                  value: "decrease",
                  label: t("product.adjust_decrease") || "减价",
                },
                { value: "set", label: t("product.adjust_set") || "直接设置" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="adjustValue"
            label={t("product.adjust_value") || "调整数值"}
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Product;
