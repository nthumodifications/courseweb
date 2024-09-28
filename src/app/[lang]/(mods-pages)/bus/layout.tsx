import Fade from "@/components/Animation/Fade";
import { PropsWithChildren } from "react";

export const metadata = {
  title: "校園公車 Bus Schedule",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return (
    <Fade>
      <>
        {children}
        <div className="flex flex-col text-xs text-center text-muted-foreground pt-10">
          資料來自總務處事務組網站。資料錯誤請聯絡總務處事務組。
        </div>
      </>
    </Fade>
  );
}
