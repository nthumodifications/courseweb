import { Fade } from "@courseweb/ui";
import { PropsWithChildren } from "react";

export const metadata = {
  title: "時間表 Timetable",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
