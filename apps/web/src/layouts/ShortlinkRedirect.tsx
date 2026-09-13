import { useEffect } from "react";
import { useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";

const ShortlinkRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const dict = useDictionary();

  useEffect(() => {
    if (slug) {
      window.location.href = `${import.meta.env.VITE_COURSEWEB_API_URL}/l/${encodeURIComponent(slug)}`;
    }
  }, [slug]);

  return (
    <div className="p-4">
      <p className="text-muted-foreground leading-relaxed">{dict.common.redirecting}</p>
    </div>
  );
};

export default ShortlinkRedirect;
