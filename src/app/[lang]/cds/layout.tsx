import Fade from "@/components/Animation/Fade";
import Link from "next/link";
import { PropsWithChildren } from "react";

//next auth needs nodejs
export const runtime = "nodejs";

export const metadata = {
  title: "選課規劃調查 Course Demand Survey",
};

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
  return (
    <Fade>
      {children}
      <div className="flex flex-row justify-center p-2">
        <span className="text-gray-500">
          Powered by <Link href="https://nthumods.com">NTHUMods</Link>
        </span>
      </div>
    </Fade>
  );
}
