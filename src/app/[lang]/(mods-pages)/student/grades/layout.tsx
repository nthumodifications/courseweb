import { PropsWithChildren } from "react";
import Fade from "@/components/Animation/Fade";

export const metadata = {
  title: "個人成績 Grades",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return <Fade>{children}</Fade>;
}
