import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./Avatar";

const meta: Meta<typeof Avatar> = {
  title: "Shared/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    variant: {
      control: { type: "select" },
      options: ["default", "circular", "square"],
    },
    bordered: { control: "boolean" },
    dot: { control: "boolean" },
    statusColor: {
      control: { type: "select" },
      options: ["success", "warning", "error", "default"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  args: {
    src: "https://example.com/avatar.jpg",
    alt: "User Avatar",
  },
};

export const WithFallback: Story = {
  args: {
    fallback: "AB",
  },
};

export const WithIconFallback: Story = {
  args: {
    fallback: <span className="material-symbols-outlined">person</span>,
  },
};

export const Sizes: Story = {
  args: {
    src: "https://example.com/avatar.jpg",
    alt: "User Avatar",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows all available sizes",
      },
    },
  },
};

export const Variants: Story = {
  args: {
    src: "https://example.com/avatar.jpg",
    alt: "User Avatar",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows all available variants",
      },
    },
  },
};

export const Bordered: Story = {
  args: {
    src: "https://example.com/avatar.jpg",
    alt: "User Avatar",
    bordered: true,
  },
};

export const WithDot: Story = {
  args: {
    src: "https://example.com/avatar.jpg",
    alt: "User Avatar",
    dot: true,
    statusColor: "success",
  },
};

export const Combinations: Story = {
  args: {
    src: "https://example.com/avatar.jpg",
    alt: "User Avatar",
    variant: "circular",
    bordered: true,
    dot: true,
    statusColor: "warning",
    size: "lg",
  },
};
