import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

const meta: Meta<typeof Card> = {
  title: "Shared/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: "Default Card",
  },
};

export const WithCustomClass: Story = {
  args: {
    className: "border-lg p-8",
    children: "Card with Custom Class",
  },
};
