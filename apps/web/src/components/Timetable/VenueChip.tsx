import { Link, useParams } from "react-router-dom";
import { FC } from "react";

export const VenueChip: FC<{
  venue: string;
  color: string;
  textColor: string;
}> = ({ venue, color, textColor }) => {
  const { lang } = useParams<{ lang: string }>();
  return (
    <Link
      className="flex flex-row justify-center items-center text-center text-[8px] md:text-[10px] rounded-md px-1 py-0.5"
      style={{ backgroundColor: color + "24", color: textColor }}
      to={`/${lang}/venues/${venue}`}
    >
      <span className="">{venue}</span>
    </Link>
  );
};
