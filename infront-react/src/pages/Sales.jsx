/**
 * 收银台页面
 * 核心功能：模拟扫码枪输入ID -> 加入购物车 -> 确认收款（触发后端扣减库存与碳减排计算）
 * 适配：移动端响应式布局，左右两栏在手机上自动堆叠，表格允许横向滑动
 * 新增：数量增减按钮（减到0自动移除）
 */
import React, { useState, useEffect } from "react";
import {
  Card,
  Input,
  Button,
  Table,
  message,
  Row,
  Col,
  Statistic,
  InputNumber,
} from "antd";
import {
  ScanOutlined,
  CloudOutlined,
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import { getProductList } from "../api/product";
import { checkout } from "../api/sales";
import { useTranslation } from "react-i18next";

const Sales = () => {
  const { t, i18n } = useTranslation();

  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    getProductList().then((res) => setAllProducts(res.data));
  }, []);

  // ==================== 扫码添加商品 ====================
  const handleScan = (e) => {
    if (e.key === "Enter") {
      const product = allProducts.find((p) => p.id === Number(barcode));

      if (!product) {
        message.error(t("sales.not_found") || "未找到该商品，请检查条码号！");
      } else if (product.stock <= 0) {
        message.warning(t("sales.out_of_stock") || "该商品库存不足！");
      } else {
        const existing = cart.find((item) => item.id === product.id);
        if (existing) {
          if (existing.quantity >= product.stock) {
            message.warning(`库存不足，当前库存 ${product.stock}`);
            setBarcode("");
            return;
          }
          setCart(
            cart.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            ),
          );
        } else {
          setCart([...cart, { ...product, quantity: 1 }]);
        }
        message.success((t("sales.added") || "已添加: ") + product.goods_name);
      }
      setBarcode("");
    }
  };

  // ==================== 数量增减 ====================
  // 增加数量
  const handleIncrease = (record) => {
    if (record.quantity >= record.stock) {
      message.warning(`库存不足，当前库存 ${record.stock}`);
      return;
    }
    setCart(
      cart.map((item) =>
        item.id === record.id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  // 减少数量（减到0时自动移除）
  const handleDecrease = (record) => {
    if (record.quantity <= 1) {
      // 数量为1时再减 → 从购物车移除
      setCart(cart.filter((item) => item.id !== record.id));
      message.info(`已取消 ${record.goods_name}`);
    } else {
      setCart(
        cart.map((item) =>
          item.id === record.id
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        ),
      );
    }
  };

  // 手动输入数量
  const handleQuantityChange = (record, value) => {
    if (!value || value <= 0) {
      // 输入0或空 → 移除
      setCart(cart.filter((item) => item.id !== record.id));
      message.info(`已取消 ${record.goods_name}`);
      return;
    }
    if (value > record.stock) {
      message.warning(`库存不足，当前库存 ${record.stock}`);
      return;
    }
    setCart(
      cart.map((item) =>
        item.id === record.id ? { ...item, quantity: value } : item,
      ),
    );
  };

  // ==================== 结算 ====================
  const handleCheckout = async () => {
    if (cart.length === 0)
      return message.warning(t("sales.empty_cart") || "购物车为空");
    try {
      for (const item of cart) {
        await checkout({ goods_id: item.id, quantity: item.quantity });
      }
      message.success(t("sales.checkout_success") || "结算成功！库存已扣减");
      setCart([]);
      getProductList().then((res) => setAllProducts(res.data));
    } catch (error) {
      message.error(t("sales.checkout_fail") || "结算失败，请重试");
    }
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.sell_price * item.quantity,
    0,
  );
  const totalCarbon = cart.reduce(
    (sum, item) => sum + item.carbon_saving * item.quantity,
    0,
  );

  // ==================== 表格列 ====================
  const columns = [
    { title: t("product.name") || "商品名称", dataIndex: "goods_name" },
    {
      title: t("product.unit_price") || "单价",
      dataIndex: "sell_price",
      width: 90,
      render: (text) => `¥${Number(text).toFixed(2)}`,
    },
    {
      title: t("product.quantity") || "数量",
      key: "quantity",
      width: 180,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Button
            size="small"
            icon={<MinusOutlined />}
            onClick={() => handleDecrease(record)}
          />
          <InputNumber
            min={0}
            max={record.stock}
            value={record.quantity}
            onChange={(val) => handleQuantityChange(record, val)}
            size="small"
            style={{ width: 60, textAlign: "center" }}
          />
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleIncrease(record)}
          />
        </div>
      ),
    },
    {
      title: t("product.subtotal") || "小计",
      key: "subtotal",
      width: 100,
      render: (_, record) => (
        <span style={{ color: "#cf1322", fontWeight: "bold" }}>
          ¥{(record.sell_price * record.quantity).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {/* 左侧：扫码与购物车 */}
      <Col xs={24} md={16}>
        <Card title={t("sales.title") || "🛒 收银台"} bordered={false}>
          <Input
            size="large"
            placeholder={t("sales.placeholder") || "请扫描商品条码或手动输入ID"}
            prefix={<ScanOutlined />}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleScan}
            autoFocus
            style={{ marginBottom: 20 }}
          />
          <Table
            key={i18n.language}
            rowKey="id"
            columns={columns}
            dataSource={cart}
            pagination={false}
            scroll={{ x: "max-content" }}
          />
        </Card>
      </Col>

      {/* 右侧：结算卡片 */}
      <Col xs={24} md={8}>
        <Card title={t("sales.settlement") || "结算信息"} bordered={false}>
          <Statistic
            title={t("sales.total") || "本次销售总额"}
            value={totalAmount}
            precision={2}
            prefix="¥"
            valueStyle={{ color: "#cf1322", fontSize: 32 }}
          />
          <Statistic
            title={t("sales.carbon") || "本次碳减排量"}
            value={totalCarbon}
            precision={2}
            suffix="kg"
            prefix={<CloudOutlined />}
            style={{ marginTop: 20 }}
            valueStyle={{ color: "#1890ff" }}
          />
          <Button
            type="primary"
            size="large"
            block
            style={{ marginTop: 40, height: 50, fontSize: 18 }}
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            {t("sales.checkout") || "确认收款"}
          </Button>
        </Card>
      </Col>
    </Row>
  );
};

export default Sales;
