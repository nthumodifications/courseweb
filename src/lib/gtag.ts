export const GA_TRACKING_ID: string | undefined = 'G-WX2Y030ZGR';
    
export const pageview = (url: string) => {
    if(typeof window === 'undefined') return;
    (window as any).gtag("config", GA_TRACKING_ID, {
        page_path: url,
    });
};

export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label: string;
  value: number;
}) => {
    if(typeof window === 'undefined') return;
    (window as any).gtag("event", action, {
        event_category: category,
        event_label: label,
        value: value,
    });
};