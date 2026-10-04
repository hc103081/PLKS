import type { Meta, StoryObj } from "@storybook/react";
import { Drawer } from "./Drawer";

const meta: Meta<typeof Drawer> = {
  title: "Shared/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  argTypes: {
    isOpen: { control: "boolean" },
    title: { control: "text" },
    placement: { control: { type: "radio", options: ["left", "right", "top", "bottom"] } },
    size: { control: { type: "radio", options: ["sm", "md", "lg", "full"] } },
    disableEscClose: { control: "boolean" },
    disableBackdropClose: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const RightDefault: Story = {
  args: {
    isOpen: true,
    title: "預設右側抽屜",
  },
};

export const LeftDrawer: Story = {
  args: {
    isOpen: true,
    title: "左側抽屜",
    placement: "left",
  },
};

export const TopDrawer: Story = {
  args: {
    isOpen: true,
    title: "頂部抽屜",
    placement: "top",
  },
};

export const BottomDrawer: Story = {
  args: {
    isOpen: true,
    title: "底部抽屜",
    placement: "bottom",
  },
};

export const FullWidth: Story = {
  args: {
    isOpen: true,
    title: "全寬抽屜",
    size: "full",
  },
};

export const Small: Story = {
  args: {
    isOpen: true,
    title: "小型抽屜",
    size: "sm",
  },
};

export const DisabledEsc: Story = {
  args: {
    isOpen: true,
    title: "禁用 ESC 關閉",
    disableEscClose: true,
  },
};

export const DisabledBackdrop: Story = {
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
