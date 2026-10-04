import type { Meta, StoryObj } from "@storybook/react";
import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "Shared/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  argTypes: {
    size: { control: { type: "radio", options: ["sm", "md"] } },
    variant: { control: { type: "radio", options: ["default", "primary", "secondary"] } },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const tabs = [
  { key: "tab1", label: "標籤 1" },
  { key: "tab2", label: "標籤 2" },
  { key: "tab3", label: "標籤 3" },
];

const tabsWithDisabled = [
  { key: "tab1", label: "標籤 1" },
  { key: "tab2", label: "標籤 2", disabled: true },
  { key: "tab3", label: "標籤 3" },
];

export const Default: Story = {
  args: {
    tabs,
    activeKey: "tab1",
    onChange: (key) => console.log(`切換到: ${key}`),
  },
};

export const WithDisabled: Story = {
  args: {
    tabs: tabsWithDisabled,
    activeKey: "tab1",
    onChange: (key) => console.log(`切換到: ${key}`),
  },
};

export const Sizes: Story = {
  args: {
    tabs,
    activeKey: "tab1",
    onChange: (key) => console.log(`切換到: ${key}`),
  },
  parameters: {
    docs: {
      description: {
        story: "不同大小的標籤頁",
      },
    },
  },
};

export const Variants: Story = {
  args: {
    tabs,
    activeKey: "tab1",
    onChange: (key) => console.log(`切換到: ${key}`),
  },
  parameters: {
    docs: {
      description: {
        story: "不同變體樣式的標籤頁",
      },
    },
  },
};

export const WithContent: Story = {
  args: {
    tabs,
    activeKey: "tab1",
    onChange: (key) => console.log(`切換到: ${key}`),
  },
  render: (args) => (
    <Tabs {...args}>
      <div className="mt-4 p-4 border rounded">
        這是內容區域。目前顯示的標籤是：{args.activeKey}
      </div>
    </Tabs>
  ),
};
