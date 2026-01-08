import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarSearch } from "../CalendarSearch";

describe("CalendarSearch", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with default placeholder", () => {
    render(<CalendarSearch value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText("Search events...");
    expect(input).toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(
      <CalendarSearch
        value=""
        onChange={mockOnChange}
        placeholder="Find your event"
      />,
    );

    const input = screen.getByPlaceholderText("Find your event");
    expect(input).toBeInTheDocument();
  });

  it("displays current value", () => {
    render(<CalendarSearch value="meeting" onChange={mockOnChange} />);

    const input = screen.getByDisplayValue("meeting");
    expect(input).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    render(<CalendarSearch value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText("Search events...");
    fireEvent.change(input, { target: { value: "test" } });

    expect(mockOnChange).toHaveBeenCalledWith("test");
  });

  it("calls onChange with each keystroke", () => {
    render(<CalendarSearch value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText("Search events...");

    fireEvent.change(input, { target: { value: "t" } });
    expect(mockOnChange).toHaveBeenCalledWith("t");

    fireEvent.change(input, { target: { value: "te" } });
    expect(mockOnChange).toHaveBeenCalledWith("te");

    fireEvent.change(input, { target: { value: "tes" } });
    expect(mockOnChange).toHaveBeenCalledWith("tes");

    expect(mockOnChange).toHaveBeenCalledTimes(3);
  });

  describe("Clear button", () => {
    it("does not show clear button when value is empty", () => {
      render(<CalendarSearch value="" onChange={mockOnChange} />);

      const clearButtons = screen.queryAllByRole("button");
      expect(clearButtons.length).toBe(0);
    });

    it("shows clear button when value is not empty", () => {
      render(<CalendarSearch value="test" onChange={mockOnChange} />);

      const clearButtons = screen.getAllByRole("button");
      expect(clearButtons.length).toBeGreaterThan(0);
    });

    it("clears value when clicking clear button", () => {
      render(<CalendarSearch value="test query" onChange={mockOnChange} />);

      const clearButton = screen.getAllByRole("button")[0];
      fireEvent.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith("");
    });
  });
});
