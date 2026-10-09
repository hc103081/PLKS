import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SemesterTabs } from "./SemesterTabs";

describe("SemesterTabs", () => {
  const mockOnChange = vi.fn();

  it("should render all semester labels by default", () => {
    render(<SemesterTabs onChange={mockOnChange} />);

    // Check "全部" button exists
    const allButton = screen.getByRole("button", { name: /全部/ });
    expect(allButton).toBeInTheDocument();

    // Check semester labels exist (大一上、大一下 etc.)
    const semesters = [
      "大一上",
      "大一下",
      "大二上",
      "大二下",
      "大三上",
      "大三下",
      "大四上",
      "大四下",
    ];
    for (const semester of semesters) {
      const semesterButton = screen.getByRole("button", { name: new RegExp(semester) });
      expect(semesterButton).toBeInTheDocument();
    }
  });

  it("should call onChange when clicking a semester", async () => {
    render(<SemesterTabs onChange={mockOnChange} />);

    // Click "全部" button
    const allButton = screen.getByRole("button", { name: /全部/ });
    await userEvent.click(allButton);

    expect(mockOnChange).toHaveBeenCalledWith("all");

    // Click "大一上" button
    const fall1Button = screen.getByRole("button", { name: /大一上/ });
    await userEvent.click(fall1Button);

    expect(mockOnChange).toHaveBeenCalledWith("103-1");
  });

  it("should handle user click and process events", async () => {
    render(<SemesterTabs onChange={vi.fn()} />);

    const allButton = screen.getByRole("button", { name: /全部/ });
    await userEvent.click(allButton);

    // Confirm page is still in document and no errors
    expect(allButton).toBeInTheDocument();
  });
});
