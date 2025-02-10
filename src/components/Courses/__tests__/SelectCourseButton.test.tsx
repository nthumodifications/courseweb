import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectCourseButton from "../SelectCourseButton";

// Mock useParams
jest.mock("next/navigation", () => ({
  useParams: () => ({
    query: { lang: "en" },
  }),
}));

// Mock useUserTimetable
const mockIsCourseSelected = jest.fn();
const mockAddCourse = jest.fn();
const mockDeleteCourse = jest.fn();
jest.mock("@/hooks/contexts/useUserTimetable", () => ({
  __esModule: true,
  default: () => ({
    isCourseSelected: mockIsCourseSelected,
    addCourse: mockAddCourse,
    deleteCourse: mockDeleteCourse,
  }),
}));

// Mock useLocalStorage
let mockFavourites: string[] = [];
jest.mock("usehooks-ts", () => ({
  ...jest.requireActual("usehooks-ts"),
  useLocalStorage: () => [
    mockFavourites,
    (newFavs: string[]) => (mockFavourites = newFavs),
  ],
}));

describe("SelectCourseButton", () => {
  beforeEach(() => {
    mockFavourites = [];
    mockIsCourseSelected.mockClear();
    mockAddCourse.mockClear();
    mockDeleteCourse.mockClear();
  });

  test("renders 'Add' button if course not selected", () => {
    mockIsCourseSelected.mockReturnValue(false);
    render(<SelectCourseButton courseId="11310EECS120001" />);
    expect(screen.getByText("加入這學期")).toBeInTheDocument();
  });

  test("calls addCourse when clicking add button", () => {
    mockIsCourseSelected.mockReturnValue(false);
    render(<SelectCourseButton courseId="11310EECS120001" />);
    fireEvent.click(screen.getByText("加入這學期"));
    expect(mockAddCourse).toHaveBeenCalledWith("11310EECS120001");
  });

  test("renders 'Remove' button if course is selected", () => {
    mockIsCourseSelected.mockReturnValue(true);
    render(<SelectCourseButton courseId="11310EECS120001" />);
    expect(screen.getByText("退掉這學期")).toBeInTheDocument();
  });

  test("calls deleteCourse when clicking remove button", () => {
    mockIsCourseSelected.mockReturnValue(true);
    render(<SelectCourseButton courseId="11310EECS120001" />);
    fireEvent.click(screen.getByText("退掉這學期"));
    expect(mockDeleteCourse).toHaveBeenCalledWith("11310EECS120001");
  });
});
