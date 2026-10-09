import type { Meta, StoryObj } from "@storybook/react";
import { CourseCardSkeleton } from "./CourseCardSkeleton";

const meta: Meta<typeof CourseCardSkeleton> = {
  title: "Dashboard/CourseCardSkeleton",
  component: CourseCardSkeleton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CourseCardSkeleton>;

export const Default: Story = {
  args: {
    skeletonCount: 3,
  },
};

export const FourSkeletons: Story = {
  args: {
    skeletonCount: 4,
  },
};
