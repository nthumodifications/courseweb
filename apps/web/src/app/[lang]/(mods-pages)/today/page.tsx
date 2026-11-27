import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/chunk-recovery";

const WidgetGridDynamic = lazyWithRetry(
  () => import("@/components/Widgets/WidgetGrid"),
);

const TodayPage = () => {
  return (
    <Suspense fallback={null}>
      <WidgetGridDynamic />
    </Suspense>
  );
};

export default TodayPage;
