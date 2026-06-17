import {
  Store,
  Bus,
  MapPin,
  Gamepad,
  BookOpen,
  Globe,
  CalendarIcon,
  SquareGanttChart,
  Sparkles,
  Dumbbell,
  GraduationCap,
  CreditCard,
  Package,
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
  target?: string;
  beta?: boolean;
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
    id: "chat",
    category: "course",
    title_zh: "AI 課程助手",
    title_en: "AI Course Assistant",
    href: "/chat",
    Icon: Sparkles,
    beta: true,
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
    id: "sports-venues",
    category: "campuslife",
    title_zh: "體育場館使用人數",
    title_en: "Sports Venue Occupancy",
    href: "/sports-venues",
    Icon: Dumbbell,
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

  {
    id: "planner",
    category: "course",
    title_zh: "畢業規劃",
    title_en: "Planner",
    href: "/student/planner",
    Icon: SquareGanttChart,
    beta: true,
  },
  {
    id: "grades",
    category: "other",
    title_zh: "成績查詢",
    title_en: "Grades",
    href: "/student/grades",
    Icon: GraduationCap,
  },
  {
    id: "student-id",
    category: "other",
    title_zh: "學生證 & 門禁",
    title_en: "Student ID & Door Access",
    href: "/student/id",
    Icon: CreditCard,
  },
  {
    id: "parcel",
    category: "other",
    title_zh: "宿舍包裹",
    title_en: "Parcel Tracking",
    href: "/student/parcel",
    Icon: Package,
  },
];
