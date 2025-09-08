import { Fade } from "@courseweb/ui";
import Link from "next/link";
import { PropsWithChildren } from "react";

export const metadata = {
  title: "校園公車 Bus Schedule",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return (
    <Fade>
      <>
        {children}
        <div className="text-xs text-center text-muted-foreground pt-10">
          資料來自
          <Link
            href="https://github.com/NTHU-SA/NTHU-Data-API"
            className="inline underline"
          >
            學生會 NTHU Data API
          </Link>
          . 資料問題請直接向學生會反映.
        </div>
      </>
    </Fade>
  );
}
