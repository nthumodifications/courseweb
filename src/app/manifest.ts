import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "nthumods",
    name: "NTHUMods",
    short_name: "NTHUMods",
    description:
      "🏫 國立清華大學課表、校車時間表、資料整合平臺，學生主導、學生自主開發。",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "any",
    start_url: "https://nthumods.com",
    lang: "zh",
    dir: "auto",
    theme_color: "#7e1083",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "images/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "images/icons/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "images/icons/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "images/icons/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        src: "images/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "images/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "images/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
