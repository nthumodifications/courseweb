import Header from "@/components/Header";
import SideNav from "@/components/SideNav";
import BottomNav from "@/components/BottomNav";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import ConsoleLogger from "@/components/ConsoleLogger";
import { LangProps } from "@/types/pages";

const NTHUModsLayout = ({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
} & LangProps) => {
  return (
    <>
      <GoogleAnalytics />
      <ConsoleLogger />

      <div
        className={`grid grid-cols-1 grid-rows-[var(--header-height)_var(--content-height)_auto] md:grid-cols-[12rem_auto] pb-[5rem] md:pb-0`}
      >
        <Header />
        <div className="hidden md:flex h-full px-2 pt-8 pl-8">
          <SideNav />
        </div>
        <main className="overflow-y-auto overflow-x-hidden h-full w-full scroll-smooth [&>div]:h-full pt-8 md:pl-8">
          {children}
          {modal}
        </main>
      </div>
      <BottomNav />
    </>
  );
};

export default NTHUModsLayout;
