import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./Select";

const meta: Meta<typeof Select> = {
  title: "Shared/Select",
  component: Select,
  tags: ["autodocs"],
  argTypes: {
    size: { control: { type: "radio", options: ["sm", "md"] } },
    variant: { control: { type: "radio", options: ["default", "primary", "secondary"] } },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

const options = [
  { value: "apple", label: "蘋果" },
  { value: "banana", label: "香蕉", disabled: true },
  { value: "orange", label: "橙子" },
  { value: "grape", label: "葡萄" },
];

/**
 * 預設故事 - 顯示基本選項和預留文字
 */
export const Default: Story = {
  args: {
    options,
    value: "apple",
    onChange: (value) => {
      console.log("Selected value:", value);
    },
    placeholder: "請選擇水果",
  },
};

/**
 * 不同選項配置
 */
export const OptionConfigurations: Story = {
  args: {
    options: [
      { value: "1", label: "選項 1" },
      { value: "2", label: "選項 2" },
      { value: "3", label: "選項 3" },
    ],
    value: "1",
    onChange: (value) => {
      console.log("Selected value:", value);
    },
    placeholder: "請選擇選項",
  },
};

/**
 * 大小變體
 */
export const SizeVariants: Story = {
  args: {
    options,
    value: "apple",
    onChange: (value) => {
      console.log("Selected value:", value);
    },
  },
};

/**
 * 變體樣式
 */
export const VariantStyles: Story = {
  args: {
    options,
    value: "apple",
    onChange: (value) => {
      console.log("Selected value:", value);
    },
  },
};

/**
 * 禁用狀態
 */
export const DisabledSelect: Story = {
  args: {
    options,
    value: "apple",
    onChange: (value) => {
      console.log("Selected value:", value);
    },
    disabled: true,
  },
};

/**
 * 帶有預留文字
 */
export const WithPlaceholder: Story = {
  args: {
    options,
    value: null,
    onChange: (value) => {
      console.log("Selected value:", value);
    },
    placeholder: "請選擇水果",
  },
};

/**
 * 受控 vs 非受控使用模式
 * 注意：Select 元件是受控組件，必須透過 value 和 onChange 來控制。
 * 這裡我們展示受控使用方式。
 */
export const ControlledUsage: Story = {
  args: {
    options,
    value: "orange",
    onChange: (value) => {
      console.log("Selected value:", value);
    },
    placeholder: "請選擇水果",
  },
};

/**
 * 非受控使用模式（不建議，但展示）
 * 實際上，如果不提供 value 和 onChange，Select 會表現為非受控。
 * 但根據我們的元件設計，它需要 value 和 onChange。
 * 所以這個故事僅作為參考，展示如果忘記傳遞 value 和 onChange 會發生什麼事。
 */
export const UncontrolledUsage: Story = {
  args: {
    options,
    // 故意不傳遞 value 和 onChange，讓元件使用預設行為
    // 但這會導致 TypeScript 錯誤，所以我們需要傳遞 undefined 來模擬
    value: undefined as unknown as string | number | null,
    onChange: () => {},
    placeholder: "請選擇水果",
  },
};
