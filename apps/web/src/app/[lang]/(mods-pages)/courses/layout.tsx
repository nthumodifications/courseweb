import { PropsWithChildren } from "react";
import { Fade } from "@courseweb/ui";

export const metadata = {
  title: "課表 Courses",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
