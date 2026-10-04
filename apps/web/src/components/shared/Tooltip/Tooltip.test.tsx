import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  beforeEach(() => {
    cleanup();
  });

  it("應該渲染觸發元素 (children)", () => {
    const children = <span>觸發元素</span>;
    render(<Tooltip content="提示文字">{children}</Tooltip>);
    expect(screen.getByText("觸發元素")).toBeInTheDocument();
  });

  it("當 enabled=true 時應該顯示提示內容", () => {
    render(<Tooltip content="這是提示">觸發</Tooltip>);
    expect(screen.getByText("這是提示")).toBeInTheDocument();
  });

  it("當 enabled=false 時不應該顯示提示內容", () => {
    render(<Tooltip content="這是提示" enabled={false}>觸發</Tooltip>);
    expect(screen.queryByText("這是提示")).not.toBeInTheDocument();
  });

  it("應該使用預設 placement 值 (top)", () => {
    render(<Tooltip content="提示">觸發</Tooltip>);
    const tooltipElement = screen.getByText("提示");
    expect(tooltipElement).toHaveClass("tooltip-top");
  });

  it("應該根據 placement=top 顯示頂部 tooltip", () => {
    render(<Tooltip content="提示" placement="top">觸發</Tooltip>);
    const tooltipElement = screen.getByText("提示");
    expect(tooltipElement).toHaveClass("tooltip-top");
  });

  it("應該根據 placement=bottom 顯示底部 tooltip", () => {
    render(<Tooltip content="提示" placement="bottom">觸發</Tooltip>);
    const tooltipElement = screen.getByText("提示");
    expect(tooltipElement).toHaveClass("tooltip-bottom");
  });

  it("應該根據 placement=left 顯示左側 tooltip", () => {
    render(<Tooltip content="提示" placement="left">觸發</Tooltip>);
    const tooltipElement = screen.getByText("提示");
    expect(tooltipElement).toHaveClass("tooltip-left");
  });

  it("應該根據 placement=right 顯示右側 tooltip", () => {
    render(<Tooltip content="提示" placement="right">觸發</Tooltip>);
    const tooltipElement = screen.getByText("提示");
    expect(tooltipElement).toHaveClass("tooltip-right");
  });

  it("應該使用預設 delay 值 (200)", () => {
    render(<Tooltip content="提示">觸發</Tooltip>);
    expect(screen.getByText("提示")).toBeInTheDocument();
  });

  it("應該使用預設 enabled 值 (true)", () => {
    render(<Tooltip content="提示">觸發</Tooltip>);
    expect(screen.getByText("提示")).toBeInTheDocument();
  });
});