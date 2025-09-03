import { Fade } from "@courseweb/ui";
import { PropsWithChildren } from "react";

export const metadata = {
  title: "等位名單 Waitlist",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
