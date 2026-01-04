"use client";
import { NextPage } from "next";
import { CalendarV2Test } from "@/components/Calendar/CalendarV2Test";

const CalendarTestPage: NextPage = () => {
  return (
    <div className="container mx-auto py-8">
      <CalendarV2Test />
    </div>
  );
};

export default CalendarTestPage;
