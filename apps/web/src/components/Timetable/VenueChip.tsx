import { Link, useParams } from "react-router-dom";
import { FC } from "react";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";

export const VenueChip: FC<{
  venue: string;
  color: string;
  textColor: string;
  fitText?: boolean;
}> = ({ venue, color, textColor, fitText = false }) => {
  const { lang } = useParams<{ lang: string }>();
  const localizeData = useLocalizedZhData();
  return (
    <Link
      className={`flex flex-row justify-center items-center text-center rounded-md px-1 py-0.5 ${
        fitText
          ? "min-w-0 max-w-full text-inherit"
          : "text-[8px] md:text-[10px]"
      }`}
      style={{ backgroundColor: color + "24", color: textColor }}
      to={`/${lang}/venues/${venue}`}
    >
      <span
        className={fitText ? "min-w-0 max-w-full break-words" : ""}
        style={fitText ? { overflowWrap: "anywhere" } : undefined}
      >
        {localizeData(venue)}
      </span>
    </Link>
  );
};
