import Fade from "@/components/Animation/Fade";
import { PropsWithChildren } from "react";
import { CalendarProvider } from "@/app/[lang]/(mods-pages)/today/calendar_hook";

export const metadata = {
  title: "行事曆 Today",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return (
    <Fade>
      <CalendarProvider>{children}</CalendarProvider>
    </Fade>
  );
}
