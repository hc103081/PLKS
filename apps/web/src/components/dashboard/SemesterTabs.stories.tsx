import type { Meta, StoryObj } from "@storybook/react";
import { SemesterTabs } from "./SemesterTabs";

const meta: Meta<typeof SemesterTabs> = {
  title: "Dashboard/SemesterTabs",
  component: SemesterTabs,
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "semesterChange" },
  },
};

export default meta;
type Story = StoryObj<typeof SemesterTabs>;

export const Default: Story = {
  args: {
    onChange: (semester) => console.log("Semester changed:", semester),
  },
};

export const WithAllSemester: Story = {
  args: {
    onChange: (semester) => console.log("Semester changed:", semester),
  },
};
