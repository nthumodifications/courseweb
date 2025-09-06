import { PropsWithChildren } from "react";
import { Fade } from "@courseweb/ui";

export const metadata = {
  title: "個人成績 Grades",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
