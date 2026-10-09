import {
  Store,
  Bus,
  Bike,
  MapPin,
  Gamepad,
  BookOpen,
  Globe,
  CalendarIcon,
  SquareGanttChart,
  Sparkles,
  Dumbbell,
  Users,
  MapPinned as CampusMapIcon,
  GraduationCap,
  WashingMachine,
  Library,
} from "lucide-react";
import ChumeiIcon from "@/components/Apps/ChumeiIcon";

type AppDefinition = {
  hidden?: boolean;
  id: string;
  category: string;
  title_zh: string;
  title_en: string;
  href: string;
  Icon: React.FC<any>;
  target?: string;
  beta?: boolean;
};

export const apps: AppDefinition[] = [
  {
    id: "courses",
    category: "courses",
    title_zh: "課程查詢",
    title_en: "Course Search",
    href: "/courses",
    Icon: BookOpen,
  },
  {
    id: "modules",
    category: "courses",
    title_zh: "課程模組",
    title_en: "Course Modules",
    href: "/courses/modules",
    Icon: BookOpen,
  },
  {
    id: "chat",
    category: "courses",
    title_zh: "AI 課程助手",
    title_en: "AI Course Assistant",
    href: "/chat",
    Icon: Sparkles,
    beta: true,
  },
  {
    id: "venues",
    category: "courses",
    title_zh: "地點相關課程",
    title_en: "Venues",
    href: "/venues",
    Icon: MapPin,
  },
  {
    id: "timetable-community",
    category: "courses",
    title_zh: "社群課表",
    title_en: "Community Timetables",
    href: "/timetable/community",
    Icon: Users,
  },
  {
    id: "calendar",
    category: "studies",
    title_zh: "日曆",
    title_en: "Calendar",
    href: "/calendar",
    Icon: CalendarIcon,
  },
  {
    id: "planner",
    category: "studies",
    title_zh: "畢業規劃",
    title_en: "Planner",
    href: "/student/planner",
    Icon: SquareGanttChart,
    beta: true,
  },
  {
    id: "grades",
    category: "studies",
    title_zh: "成績與 GPA 試算",
    title_en: "Grades & GPA",
    href: "/student/grades",
    Icon: GraduationCap,
  },
  {
    id: "campus-map",
    category: "transport",
    title_zh: "互動式校園地圖",
    title_en: "Interactive Campus Map",
    href: "/map",
    Icon: CampusMapIcon,
    beta: true,
  },
  {
    id: "bus",
    category: "transport",
    title_zh: "公車",
    title_en: "Bus",
    href: "/bus",
    Icon: Bus,
  },
  {
    id: "youbike",
    category: "transport",
    title_zh: "YouBike 2.0 即時車量",
    title_en: "YouBike 2.0 Availability",
    href: "/youbike",
    Icon: Bike,
    beta: true,
  },
  {
    id: "sports-venues",
    category: "facilities",
    title_zh: "體育場館使用人數",
    title_en: "Sports Venue Occupancy",
    href: "/sports-venues",
    Icon: Dumbbell,
  },
  {
    id: "library",
    category: "facilities",
    title_zh: "圖書館即時座位",
    title_en: "Library Space Vacancy",
    href: "/library",
    Icon: Library,
    beta: true,
  },
  {
    id: "laundry",
    category: "facilities",
    title_zh: "宿舍洗衣機",
    title_en: "Dorm Laundry",
    href: "/laundry",
    Icon: WashingMachine,
    beta: true,
  },
  {
    id: "shops",
    category: "services",
    title_zh: "餐廳及服務",
    title_en: "Shops",
    href: "/shops",
    Icon: Store,
  },
  {
    id: "clubs_info",
    category: "links",
    title_zh: "社團資訊",
    title_en: "Clubs Information",
    href: "https://outrageous-savory-d52.notion.site/d33567eea7814fc6b91744351eb2ba6a",
    Icon: Gamepad,
  },
  {
    id: "chumei",
    category: "links",
    title_zh: "竹梅活動觀測站",
    title_en: "Chumei Campus Events",
    href: "https://chumei.observe.tw",
    Icon: ChumeiIcon,
  },
  {
    id: "scholarship",
    category: "links",
    title_zh: "清華助學系統",
    title_en: "NTHU Scholarship",
    href: "https://meo110.wwlc.nthu.edu.tw/",
    Icon: Globe,
  },
];

export const categories = Array.from(new Set(apps.map((app) => app.category)));
