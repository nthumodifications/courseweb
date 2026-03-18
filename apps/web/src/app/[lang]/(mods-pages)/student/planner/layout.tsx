import { Outlet } from "react-router-dom";
import { PlannerDBProvider } from "@/app/[lang]/(mods-pages)/student/planner/rxdb";
import { PlannerReplicationProvider } from "@/app/[lang]/(mods-pages)/student/planner/planner-replication";

export default function PlannerLayout() {
  return (
    <PlannerDBProvider>
      <PlannerReplicationProvider>
        <Outlet />
      </PlannerReplicationProvider>
    </PlannerDBProvider>
  );
}
