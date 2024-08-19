import Fade from "@/components/Animation/Fade";
import { PropsWithChildren } from "react";

export const metadata = {
  title: "等位名單 Waitlist",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
