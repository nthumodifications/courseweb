import React from "react";
import { Metadata } from "next";
import { PlannerDBProvider } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { PlannerReplicationProvider } from "@/app/[lang]/(mods-pages)/student/planner/planner-replication";

export const metadata: Metadata = {
  title: "Student Planner",
};

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlannerDBProvider>
      <PlannerReplicationProvider>{children}</PlannerReplicationProvider>
    </PlannerDBProvider>
  );
}
