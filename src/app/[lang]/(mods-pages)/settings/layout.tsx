import { PropsWithChildren } from "react";
import Fade from "@/components/Animation/Fade";

export const metadata = {
  title: "設定 Settings",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
