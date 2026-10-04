import type { Meta, StoryObj } from "@storybook/react";
import { Tooltip } from "./Tooltip";

const meta: Meta<typeof Tooltip> = {
  title: "Shared/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  argTypes: {
    placement: { control: { type: "radio", options: ["top", "bottom", "left", "right"] } },
    delay: { control: "number" },
    enabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const TopPlacement: Story = {
  args: {
    children: <button>懸停我</button>,
    content: "這是頂部提示",
    placement: "top",
  },
};

export const BottomPlacement: Story = {
  args: {
    children: <button>懸停我</button>,
    content: "這是底部提示",
    placement: "bottom",
  },
};

export const LeftPlacement: Story = {
  args: {
    children: <button>懸停我</button>,
    content: "這是左側提示",
    placement: "left",
  },
};

export const RightPlacement: Story = {
  args: {
    children: <button>懸停我</button>,
    content: "這是右側提示",
    placement: "right",
  },
};

export const Disabled: Story = {
  args: {
    children: <button>懸停我</button>,
    content: "這不會顯示",
    enabled: false,
  },
};

export const WithTextTrigger: Story = {
  args: {
    children: "點擊這裡",
    content: "文字觸發的提示",
    placement: "top",
  },
};

export const CustomContent: Story = {
  args: {
    children: <span>圖標</span>,
    content: "這是自訂內容提示",
    placement: "right",
  },
};
