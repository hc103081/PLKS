import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "./Modal";

const meta: Meta<typeof Modal> = {
  title: "Shared/Modal",
  component: Modal,
  tags: ["autodocs"],
  argTypes: {
    isOpen: { control: "boolean" },
    title: { control: "text" },
    size: { control: { type: "radio", options: ["sm", "md", "lg", "full"] } },
    disableEscClose: { control: "boolean" },
    disableBackdropClose: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: "預設模態視窗",
  },
};

export const WithCustomContent: Story = {
  args: {
    isOpen: true,
    title: "自訂內容模態視窗",
  },
  // 要測試自訂內容，需要在故事中提供children
  // 但由於故事是靜態的，我們只展示基本結構
};

export const FullScreen: Story = {
  args: {
    isOpen: true,
    title: "全螢幕模態視窗",
    size: "full",
  },
};

export const Small: Story = {
  args: {
    isOpen: true,
    title: "小型模態視窗",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    isOpen: true,
    title: "大型模態視窗",
    size: "lg",
  },
};

export const DisabledEscClose: Story = {
  args: {
    isOpen: true,
    title: "禁用 ESC 關閉",
    disableEscClose: true,
  },
};

export const DisabledBackdropClose: Story = {
  args: {
    isOpen: true,
    title: "禁用遮罩點擊關閉",
    disableBackdropClose: true,
  },
};

export const NoTitle: Story = {
  args: {
    isOpen: true,
    // 沒有標題
  },
};
