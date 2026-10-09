import type { Meta, StoryObj } from "@storybook/react";
import { Chip } from "./Chip";

const meta: Meta<typeof Chip> = {
  title: "Shared/Chip",
  component: Chip,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: {
        type: "radio",
        options: ["default", "primary", "secondary", "success", "warning", "error"],
      },
    },
    size: { control: { type: "radio", options: ["sm", "md"] } },
    clickable: { control: "boolean" },
    bordered: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {
  args: {
    variant: "default",
    size: "md",
    children: "預設 Chip",
  },
};

export const Primary: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "主要 Chip",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    size: "md",
    children: "次要 Chip",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    size: "md",
    children: "成功 Chip",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    size: "md",
    children: "警告 Chip",
  },
};

export const ErrorVariant: Story = {
  args: {
    variant: "error",
    size: "md",
    children: "錯誤 Chip",
  },
};

export const Small: Story = {
  args: {
    variant: "default",
    size: "sm",
    children: "小型 Chip",
  },
};

export const WithLeftIcon: Story = {
  args: {
    variant: "default",
    size: "md",
    children: "帶左側圖標",
    iconLeft: <span>🏷️</span>,
  },
};

export const WithRightIcon: Story = {
  args: {
    variant: "default",
    size: "md",
    children: "帶右側圖標",
    iconRight: <span>🔖</span>,
  },
};

export const WithBothIcons: Story = {
  args: {
    variant: "default",
    size: "md",
    children: "帶兩側圖標",
    iconLeft: <span>🏷️</span>,
    iconRight: <span>🔖</span>,
  },
};

export const Clickable: Story = {
  args: {
    variant: "default",
    size: "md",
    children: "可點擊 Chip",
    clickable: true,
  },
};

export const Bordered: Story = {
  args: {
    variant: "default",
    size: "md",
    children: "帶邊框 Chip",
    bordered: true,
  },
};

export const ClickableAndBordered: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "可點擊且帶邊框",
    clickable: true,
    bordered: true,
  },
};
