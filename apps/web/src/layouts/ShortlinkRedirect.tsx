import { useEffect } from "react";
import { useParams } from "react-router-dom";

const ShortlinkRedirect = () => {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (slug) {
      window.location.href = `${import.meta.env.VITE_COURSEWEB_API_URL}/l/${encodeURIComponent(slug)}`;
    }
  }, [slug]);

  return (
    <div className="grid place-items-center h-screen">
      <p>Redirecting...</p>
    </div>
  );
};

export default ShortlinkRedirect;
