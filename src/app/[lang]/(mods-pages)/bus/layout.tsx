import Fade from "@/components/Animation/Fade";
import { PropsWithChildren } from "react";

export const metadata = {
  title: "校園公車 Bus Schedule",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
