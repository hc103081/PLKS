import type { Meta, StoryObj } from "@storybook/react";
import { PipelineSummary } from "./PipelineSummary";

const meta: Meta<typeof PipelineSummary> = {
  title: "Dashboard/PipelineSummary",
  component: PipelineSummary,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PipelineSummary>;

export const Healthy: Story = {
  args: {
    inProgress: 3,
    pending: 2,
    needsAttention: 1,
    healthy: true,
    healthPercentage: 75,
  },
};

export const NeedsAttention: Story = {
  args: {
    inProgress: 5,
    pending: 3,
    needsAttention: 2,
    healthy: false,
    healthPercentage: 30,
  },
};
