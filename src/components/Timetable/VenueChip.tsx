import Link from "next/link";
import { FC } from "react";

export const VenueChip: FC<{
  venue: string;
  color: string;
  textColor: string;
}> = ({ venue, color, textColor }) => {
  return (
    <Link
      className="flex flex-row justify-center items-center text-center text-[8px] md:text-[10px] rounded-full px-1 py-0.5"
      style={{ backgroundColor: color, color: textColor }}
      href={`/venues/${venue}`}
    >
      <span className="">{venue}</span>
    </Link>
  );
};
