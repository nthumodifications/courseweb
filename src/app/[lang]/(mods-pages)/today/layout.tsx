import Fade from "@/components/Animation/Fade";
import { PropsWithChildren } from "react";

export const metadata = {
  title: "行事曆 Today",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
