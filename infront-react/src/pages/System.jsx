/**
 * 系统设置与审计日志页面
 * 包含：审计日志、一键生成数据、用户管理（占位）
 */
import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  message,
  Tag,
  Space,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
} from "antd";
import {
  ReloadOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  UserOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  getSystemLogs,
  generateMockData,
  getUserList,
  addUser,
} from "../api/system";
import AuthButton from "../components/AuthButton";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

const System = () => {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userForm] = Form.useForm();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getSystemLogs();
      setLogs(res.data);
    } catch (error) {
      message.error("获取日志失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await getUserList();
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  const handleGenerateMock = async () => {
    try {
      await generateMockData();
      message.success(t("system.gen_success") || "已生成测试数据");
    } catch (error) {
      message.error(t("system.gen_fail") || "生成失败");
    }
  };

  const handleFeatureDev = (featureName) => {
    message.info(
      `${featureName} - ${t("system.dev_tip") || "功能正在开发中，敬请期待..."}`,
    );
  };

  const handleAddUser = async (values) => {
    try {
      const res = await addUser(values);
      if (res.code === 501) {
        message.info("用户管理功能开发中，敬请期待");
      } else {
        message.success("添加成功");
        fetchUsers();
      }
      setUserModalVisible(false);
      userForm.resetFields();
    } catch (error) {
      message.info("用户管理功能开发中，敬请期待");
      setUserModalVisible(false);
    }
  };

  const logColumns = [
    { title: t("system.id") || "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: t("system.user") || "操作人",
      dataIndex: "username",
      key: "username",
    },
    {
      title: t("system.type") || "操作类型",
      dataIndex: "action",
      key: "action",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: t("system.detail") || "操作详情",
      dataIndex: "details",
      key: "details",
    },
    {
      title: t("system.time") || "操作时间",
      dataIndex: "create_time",
      key: "create_time",
      render: (text) => (text ? dayjs(text).format("YYYY-MM-DD HH:mm") : "-"),
    },
  ];

  const userColumns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: t("system.username") || "用户名",
      dataIndex: "username",
      key: "username",
    },
    {
      title: t("system.real_name") || "真实姓名",
      dataIndex: "real_name",
      key: "real_name",
    },
    {
      title: t("system.role") || "角色",
      dataIndex: "role",
      key: "role",
      render: (text) => {
        const roleMap = {
          admin: { color: "red", label: "系统管理员" },
          hq_leader: { color: "purple", label: "总部领导" },
          store_manager: { color: "blue", label: "店长" },
          stocker: { color: "green", label: "理货员" },
        };
        const cfg = roleMap[text] || { color: "default", label: text };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: t("product.store") || "所属门店",
      dataIndex: "store_id",
      key: "store_id",
      render: (text) => (text ? (text === 1 ? "A店" : "B店") : "-"),
    },
    {
      title: t("system.time") || "创建时间",
      dataIndex: "create_time",
      key: "create_time",
    },
  ];

  return (
    <Card
      title={t("system.title") || "系统设置与审计日志"}
      size="small"
      bordered={false}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
      bodyStyle={{ flex: 1, overflow: "hidden", padding: 0 }}
      extra={
        <AuthButton
          permission="system:reset"
          type="primary"
          danger
          size="small"
          onClick={handleGenerateMock}
        >
          {t("system.generate") || "一键生成测试数据"}
        </AuthButton>
      }
    >
      <Space style={{ margin: "12px 16px", flexWrap: "wrap" }}>
        <Button
          icon={<DatabaseOutlined />}
          size="small"
          onClick={() => handleFeatureDev(t("system.backup") || "数据备份")}
        >
          {t("system.backup") || "数据备份"}
        </Button>
        <Button
          icon={<SafetyCertificateOutlined />}
          size="small"
          onClick={() => handleFeatureDev(t("system.permission") || "权限管理")}
        >
          {t("system.permission") || "权限管理"}
        </Button>
        <Button
          icon={<ToolOutlined />}
          size="small"
          onClick={() => handleFeatureDev(t("system.params") || "系统参数")}
        >
          {t("system.params") || "系统参数"}
        </Button>
      </Space>

      <Tabs
        defaultActiveKey="logs"
        style={{ padding: "0 16px" }}
        items={[
          {
            key: "logs",
            label: (
              <span>
                <ReloadOutlined /> {t("system.tab_logs") || "审计日志"}
              </span>
            ),
            children: (
              <div>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={fetchLogs}
                  style={{ marginBottom: 12 }}
                  size="small"
                >
                  {t("system.refresh") || "刷新日志"}
                </Button>
                <Table
                  key={i18n.language}
                  rowKey="id"
                  columns={logColumns}
                  dataSource={logs}
                  loading={loading}
                  pagination={{ pageSize: 15, size: "small" }}
                  scroll={{ x: "max-content" }}
                />
              </div>
            ),
          },
          {
            key: "users",
            label: (
              <span>
                <UserOutlined /> {t("system.tab_users") || "用户管理"}
              </span>
            ),
            children: (
              <div>
                <Space style={{ marginBottom: 12 }}>
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() => setUserModalVisible(true)}
                    size="small"
                  >
                    {t("system.add_user") || "添加用户"}
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchUsers}
                    size="small"
                  >
                    {t("system.refresh") || "刷新"}
                  </Button>
                </Space>
                <Table
                  key={i18n.language}
                  rowKey="id"
                  columns={userColumns}
                  dataSource={users}
                  pagination={{ pageSize: 15, size: "small" }}
                  scroll={{ x: "max-content" }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* 添加用户弹窗 */}
      <Modal
        title={t("system.add_user") || "添加用户"}
        open={userModalVisible}
        onOk={() => userForm.submit()}
        onCancel={() => setUserModalVisible(false)}
        okText={t("inventory.confirm") || "确认"}
        cancelText={t("inventory.cancel") || "取消"}
      >
        <Form form={userForm} layout="vertical" onFinish={handleAddUser}>
          <Form.Item
            name="username"
            label={t("system.username") || "用户名"}
            rules={[{ required: true }]}
          >
            <Input placeholder="例如: store_2" />
          </Form.Item>
          <Form.Item
            name="real_name"
            label={t("system.real_name") || "真实姓名"}
            rules={[{ required: true }]}
          >
            <Input placeholder="例如: 李四" />
          </Form.Item>
          <Form.Item
            name="password"
            label={t("login.password") || "密码"}
            rules={[{ required: true }]}
          >
            <Input.Password placeholder="例如: 123456" />
          </Form.Item>
          <Form.Item
            name="role"
            label={t("system.role") || "角色"}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "admin", label: "系统管理员" },
                { value: "hq_leader", label: "总部领导" },
                { value: "store_manager", label: "店长" },
                { value: "stocker", label: "理货员" },
              ]}
            />
          </Form.Item>
          <Form.Item name="store_id" label={t("product.store") || "所属门店"}>
            <Select
              allowClear
              options={[
                { value: 1, label: "A店" },
                { value: 2, label: "B店" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default System;
