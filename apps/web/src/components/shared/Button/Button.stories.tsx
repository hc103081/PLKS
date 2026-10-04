import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Shared/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: { type: "radio", options: ["primary", "secondary", "ghost"] } },
    size: { control: { type: "radio", options: ["sm", "md", "lg"] } },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary Button",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary Button",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost Button",
  },
};

export const Loading: Story = {
  args: {
    variant: "primary",
    loading: true,
    children: "Loading Button",
  },
};

export const WithIcon: Story = {
  args: {
    variant: "primary",
    children: "Button with Icon",
    iconLeft: <span>📎</span>,
  },
};
