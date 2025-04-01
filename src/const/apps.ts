import {
  AlertOctagon,
  Store,
  Bus,
  Car,
  Clipboard,
  Club,
  CreditCard,
  MapPin,
  Network,
  WalletCards,
  Gamepad,
  Paperclip,
  TicketCheck,
  CalendarCheck2,
  CalendarSearch,
  Book,
  BookOpen,
  ClipboardCheck,
  Download,
  Globe,
  HeartHandshakeIcon,
  HandCoins,
  University,
  CreditCardIcon,
  CalendarIcon,
  Notebook,
} from "lucide-react";

export const categories: {
  [id: string]: { title_zh: string; title_en: string };
} = {
  campuslife: {
    title_zh: "校園生活",
    title_en: "Campus Life",
  },
  course: {
    title_zh: "課程資訊",
    title_en: "Courses",
  },
  club: {
    title_zh: "社團",
    title_en: "Clubs",
  },
  other: {
    title_zh: "其他",
    title_en: "Others",
  },
};

export const apps: {
  hidden?: boolean;
  id: string;
  category: keyof typeof categories;
  title_zh: string;
  title_en: string;
  href: string;
  Icon: React.FC<any>;
  ais?: boolean;
  target?: string;
}[] = [
  {
    id: "courses",
    category: "course",
    title_zh: "課程查詢",
    title_en: "Course Search",
    href: "/courses",
    Icon: BookOpen,
  },
  {
    id: "venues",
    category: "course",
    title_zh: "地點相關課程",
    title_en: "Venues",
    href: "/venues",
    Icon: MapPin,
  },
  {
    id: "bus",
    category: "campuslife",
    title_zh: "公車",
    title_en: "Bus",
    href: "/bus",
    Icon: Bus,
  },
  {
    id: "shops",
    category: "campuslife",
    title_zh: "餐廳及服務",
    title_en: "Shops",
    href: "/shops",
    Icon: Store,
  },
  {
    id: "calendar",
    category: "campuslife",
    title_zh: "日曆",
    title_en: "Calendar",
    href: "/calendar",
    Icon: CalendarIcon,
  },
  {
    id: "clubs_info",
    category: "club",
    title_zh: "社團資訊",
    title_en: "Clubs Information",
    href: "https://outrageous-savory-d52.notion.site/d33567eea7814fc6b91744351eb2ba6a",
    Icon: Gamepad,
  },
  {
    id: "scholarship",
    category: "other",
    title_zh: "清華助學系統",
    title_en: "NTHU Scholarship",
    href: "https://meo110.wwlc.nthu.edu.tw/",
    Icon: Globe,
  },
];
