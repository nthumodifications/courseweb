import React from "react";
import { Metadata } from "next";
import { PlannerDBProvider } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { DragDropContextProvider } from "@/app/[lang]/(mods-pages)/student/planner/components/dnd-context-provider";

export const metadata: Metadata = {
  title: "Student Planner",
};

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlannerDBProvider>{children}</PlannerDBProvider>;
}
