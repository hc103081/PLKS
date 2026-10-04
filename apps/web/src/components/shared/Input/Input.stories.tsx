import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  title: "Shared/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: { type: "select", options: ["text", "password", "email", "number", "textarea"] },
    },
    placeholder: { control: "text" },
    value: { control: "text" },
    disabled: { control: "boolean" },
    error: { control: "boolean" },
    helperText: { control: "text" },
    rows: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: "請輸入...",
  },
};

export const WithValue: Story = {
  args: {
    placeholder: "請輸入...",
    value: "預填值",
  },
};

export const Error: Story = {
  args: {
    placeholder: "錯誤輸入",
    error: true,
  },
};

export const WithHelperText: Story = {
  args: {
    placeholder: "帶幫助文字的輸入框",
    helperText: "這是幫助文字",
  },
};

export const Textarea: Story = {
  args: {
    type: "textarea",
    placeholder: "請輸入多行文字...",
    rows: 4,
  },
};
