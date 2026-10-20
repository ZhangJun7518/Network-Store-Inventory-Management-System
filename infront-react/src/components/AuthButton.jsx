/**
 * 权限按钮组件
 * - 有权限：正常显示，可点击
 * - 无权限：显示但置灰，鼠标悬浮提示"无权限"
 * - 支持 mode="hide" 参数：无权限时完全隐藏
 */
import React from "react";
import { Button, Tooltip } from "antd";
import { hasPermission } from "../utils/permission";

const AuthButton = ({ permission, mode = "disable", children, ...props }) => {
  const allowed = hasPermission(permission);

  // 有权限：正常渲染
  if (allowed) {
    return <Button {...props}>{children}</Button>;
  }

  // 无权限 + 隐藏模式
  if (mode === "hide") {
    return null;
  }

  // 无权限 + 置灰模式（默认）
  // 注意：disabled 的按钮不触发鼠标事件，用 span 包裹才能显示 Tooltip
  return (
    <Tooltip title="您没有此操作权限，请联系管理员">
      <span style={{ display: "inline-block", cursor: "not-allowed" }}>
        <Button
          {...props}
          disabled
          style={{ ...props.style, pointerEvents: "none" }}
        >
          {children}
        </Button>
      </span>
    </Tooltip>
  );
};

export default AuthButton;
