export const GA_TRACKING_ID: string | undefined = "G-WX2Y030ZGR";

export const pageview = (url: string) => {
  if (typeof (window as any)?.gtag === "undefined") return;
  (window as any).gtag("config", GA_TRACKING_ID, {
    page_path: url,
  });
};

export const event = ({
  action,
  category,
  label,
  data,
}: {
  action: string;
  category: string;
  label: string;
  data?: any;
}) => {
  if (typeof (window as any)?.gtag === "undefined") return;
  (window as any).gtag("event", action, {
    event_category: category,
    event_label: label,
    ...data,
  });
};
