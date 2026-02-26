import { Navigate, Outlet, useParams } from "react-router-dom";
import { Suspense } from "react";
import LoadingPage from "@/components/Pages/LoadingPage";

const locales = ["en", "zh"];

const LangLayout = () => {
  const { lang } = useParams<{ lang: string }>();

  if (!lang || !locales.includes(lang)) {
    return <Navigate to="/zh/today" replace />;
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <Outlet />
    </Suspense>
  );
};

export default LangLayout;
