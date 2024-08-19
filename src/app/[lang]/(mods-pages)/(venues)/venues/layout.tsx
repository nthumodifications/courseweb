import { FC, PropsWithChildren, ReactNode } from "react";
import Fade from "@/components/Animation/Fade";
import { getVenues } from "@/lib/venues";

type LocationLayoutProps = PropsWithChildren<{
  content: ReactNode;
  sidebar: ReactNode;
}>;

export const metadata = {
  title: "地點 Venues",
};

const LocationLayout: FC<LocationLayoutProps> = async ({
  content,
  sidebar,
  children,
  ...anything
}) => {
  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[500px_auto] overflow-hidden">
      {sidebar}
      <div className="h-full overflow-y-auto overflow-x-hidden">
        <Fade>{content}</Fade>
      </div>
    </div>
  );
};

export default LocationLayout;
