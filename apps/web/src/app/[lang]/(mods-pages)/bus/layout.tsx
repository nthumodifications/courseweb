import { Fade } from "@courseweb/ui";
import Link from "next/link";
import { PropsWithChildren } from "react";

export const metadata = {
  title: "校園公車 Bus Schedule",
};

// 南大公車: https://affairs.site.nthu.edu.tw/p/412-1165-20979.php?Lang=zh-tw
// 校本部公車: https://affairs.site.nthu.edu.tw/p/412-1165-20978.php?Lang=zh-tw

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return (
    <Fade>
      <>
        {children}
        <div className="text-xs text-center text-muted-foreground pt-10">
          資料來自
          <Link
            href="https://affairs.site.nthu.edu.tw/p/412-1165-20979.php?Lang=zh-tw"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            {" "}
            南大公車{" "}
          </Link>
          及
          <Link
            href="https://affairs.site.nthu.edu.tw/p/412-1165-20978.php?Lang=zh-tw"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            {" "}
            校本部公車{" "}
          </Link>
          ，如有錯誤請在回饋回報。
        </div>
      </>
    </Fade>
  );
}
