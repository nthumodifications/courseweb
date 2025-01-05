import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddEventButton } from "../AddEventButton";
import { CalendarEvent } from "../calendar.types";
import { addMinutes, format } from "date-fns";
import { UserTimetableProvider } from "@/hooks/contexts/useUserTimetable";
import { CalendarProvider } from "../calendar_hook";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RxDBProvider } from "@/config/rxdb";

describe("AddEventButton", () => {
  const mockOnEventAdded = jest.fn();
  const defaultEvent: CalendarEvent = {
    id: "1",
    title: "Test Event",
    details: "Details",
    location: "",
    allDay: false,
    start: new Date(),
    end: addMinutes(new Date(), 30),
    repeat: null,
    color: "#bf616a",
    tag: "Event",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the button", () => {
    render(
      <AddEventButton onEventAdded={mockOnEventAdded}>
        Add Event
      </AddEventButton>,
    );
    expect(screen.getByText("Add Event")).toBeInTheDocument();
  });

  it("opens the form when button is clicked", () => {
    render(
      <AddEventButton onEventAdded={mockOnEventAdded}>
        Add Event
      </AddEventButton>,
    );
    fireEvent.click(screen.getByText("Add Event"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("form is disabled by default", () => {
    render(
      <AddEventButton onEventAdded={mockOnEventAdded}>
        Add Event
      </AddEventButton>,
    );
    fireEvent.click(screen.getByText("Add Event"));
    expect(screen.getByText(/submit/i)).toBeDisabled();
  });

  it("submits the form with default event new title", async () => {
    const user = userEvent.setup();
    render(
      <AddEventButton
        defaultEvent={defaultEvent}
        onEventAdded={mockOnEventAdded}
      >
        Add Event
      </AddEventButton>,
    );

    await user.click(screen.getByText("Add Event"));
    const titlebox = screen.getByLabelText(/event title/i);
    await user.clear(titlebox);
    await user.type(titlebox, "New Event");
    user.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(mockOnEventAdded).toHaveBeenCalledWith({
        ...defaultEvent,
        title: "New Event",
      });
    });
  });

  // it('resets form when opened', async () => {
  //     const user = userEvent.setup()
  //     render(<RxDBProvider>
  //         <QueryClientProvider client={new QueryClient()}>
  //             <UserTimetableProvider>
  //                 <CalendarProvider>
  //                     <AddEventButton onEventAdded={mockOnEventAdded}>Add Event</AddEventButton>
  //                 </CalendarProvider>
  //             </UserTimetableProvider>
  //         </QueryClientProvider>
  //     </RxDBProvider>);
  //     await user.click(screen.getByText('Add Event'));
  //     await user.type(screen.getByLabelText(/event title/i), 'New Event');
  //     // submit the form
  //     screen.debug(screen.getByText(/submit/i));
  //     user.click(screen.getByText(/submit/i));

  //     // wait till the form is closed
  //     await waitFor(() => {
  //         expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  //     });

  //     // open the form again
  //     await user.click(screen.getByText('Add Event'));

  //     // check if form is open
  //     expect(screen.getByLabelText(/event title/i)).toHaveValue('');
  // });

  it("handles allDay toggle correctly", () => {
    render(
      <AddEventButton onEventAdded={mockOnEventAdded}>
        Add Event
      </AddEventButton>,
    );
    fireEvent.click(screen.getByText("Add Event"));

    // should be checked by default, uncheck it
    const allDayCheckbox = screen.getByLabelText(/all day/i);
    fireEvent.click(allDayCheckbox);
    expect(allDayCheckbox).not.toBeChecked();
  });
});
