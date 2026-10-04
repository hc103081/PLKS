import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "Shared/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: {
        type: "radio",
        options: ["default", "primary", "secondary", "success", "warning", "error"],
      },
    },
    size: { control: { type: "radio", options: ["sm", "md"] } },
    dot: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    variant: "default",
    size: "md",
    children: "預設 Badge",
  },
};

export const Primary: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "主要 Badge",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    size: "md",
    children: "次要 Badge",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    size: "md",
    children: "成功 Badge",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    size: "md",
    children: "警告 Badge",
  },
};

export const ErrorVariant: Story = {
  args: {
    variant: "error",
    size: "md",
    children: "錯誤 Badge",
  },
};

export const Small: Story = {
  args: {
    variant: "default",
    size: "sm",
    children: "小型 Badge",
  },
};

export const Dot: Story = {
  args: {
    variant: "default",
    size: "md",
    dot: true,
    children: undefined, // dot badge typically has no children
  },
};

export const DotWithContent: Story = {
  // Note: dot prop overrides size rendering; children may still be displayed? In implementation, dot overrides size classes but children still rendered inside.
  args: {
    variant: "default",
    size: "md",
    dot: true,
    children: "點狀",
  },
};
