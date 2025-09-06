import { PropsWithChildren } from "react";
import { Fade } from "@courseweb/ui";

export const metadata = {
  title: "廠商 Shops",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
