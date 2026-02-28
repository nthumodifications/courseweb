import {
  HelpCircle,
  Calendar,
  CalendarSearch,
  Clock,
  Bus,
  Wrench,
  Users,
  BookOpen,
  MapPin,
  Cloud,
} from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { useState, useEffect, ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@courseweb/ui";
import { Button } from "@courseweb/ui";

import { useLocalStorage } from "usehooks-ts";
import { cn } from "@courseweb/ui";
import { motion } from "framer-motion";
import { ScrollArea } from "@courseweb/ui";
import { useAuth } from "react-oidc-context";
import { GreenLineIcon } from "../BusIcons/GreenLineIcon";
import { RedLineIcon } from "../BusIcons/RedLineIcon";
import { NandaLineIcon } from "../BusIcons/NandaLineIcon";

type ProgressDisplayProps = { max: number; current: number };
const ProgressDisplay = ({ current, max }: ProgressDisplayProps) => {
  return (
    <div className="w-44 h-1.5 justify-center items-center gap-1.5 inline-flex">
      {Array.from({ length: max }, (_, i) => i).map((i) => (
        <div
          key={i}
          className={cn(
            "flex-1 h-1.5 relative rounded-md",
            current >= i + 1 ? "bg-nthu-600" : "bg-zinc-100",
          )}
        />
      ))}
    </div>
  );
};

// Animation components to replace GIFs
const IntroAnimation = () => (
  <motion.div
    className="relative w-full h-full flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <motion.div
      className="absolute w-48 h-48 rounded-full bg-nthu-100"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.7, delay: 0.2 }}
    />
    <motion.div className="relative z-10 flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-16 h-16 rounded-full bg-nthu-500 flex items-center justify-center shadow-md"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 + i * 0.2 }}
        >
          <Users size={24} className="text-white" />
        </motion.div>
      ))}
    </motion.div>
  </motion.div>
);

const CoursesAnimation = () => (
  <motion.div
    className="w-full h-full relative p-2 bg-gray-50"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Time column labels */}
    <div className="absolute left-1 top-0 h-full w-8 flex flex-col text-[10px] text-gray-500">
      {["9:00", "10:00", "11:00", "12:00", "13:00", "14:00"].map((time, i) => (
        <div
          key={`time-${i}`}
          style={{ top: `${15 + i * 14}%` }}
          className="absolute"
        >
          {time}
        </div>
      ))}
    </div>

    {/* Horizontal timetable grid lines */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={`h-${i}`}
        className="absolute left-8 right-0 h-px bg-gray-200"
        style={{ top: `${15 + i * 14}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.3, delay: 0.1 * i }}
      />
    ))}

    {/* Vertical day dividers */}
    {[...Array(4)].map((_, i) => (
      <motion.div
        key={`v-${i}`}
        className="absolute top-0 bottom-0 w-px bg-gray-200"
        style={{ left: `${30 + i * 22}%` }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.3, delay: 0.1 * i }}
      />
    ))}

    {/* Course slots with better distribution */}
    {[
      {
        title: "程式設計",
        code: "CS1011",
        color: "bg-nthu-500",
        textColor: "text-white",
        top: "15%",
        left: "11%",
        width: "21%",
        height: "28%",
      },
      {
        title: "線性代數",
        code: "MATH2011",
        color: "bg-blue-500",
        textColor: "text-white",
        top: "29%",
        left: "31%",
        width: "21%",
        height: "28%",
      },
      {
        title: "資料結構",
        code: "CS2041",
        color: "bg-green-500",
        textColor: "text-white",
        top: "43%",
        left: "53%",
        width: "21%",
        height: "28%",
      },
      {
        title: "電腦網路",
        code: "CS3051",
        color: "bg-yellow-500",
        textColor: "text-gray-800",
        top: "57%",
        left: "74%",
        width: "21%",
        height: "28%",
      },
    ].map((course, i) => (
      <motion.div
        key={i}
        className={`absolute rounded-md ${course.color} ${course.textColor} shadow-sm`}
        style={{
          top: course.top,
          left: course.left,
          width: course.width,
          height: course.height,
        }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 * i }}
      >
        <div className="flex flex-col h-full p-1.5 select-none items-start justify-between">
          <div className="flex-1 flex flex-col overflow-hidden">
            <span className="text-xs font-medium">{course.code}</span>
            <span className="text-xs md:text-sm font-medium">
              {course.title}
            </span>
          </div>
          <div className="flex flex-row justify-end items-center w-full">
            <span className="text-[10px] bg-white/20 rounded-sm px-1">
              R201
            </span>
          </div>
        </div>
      </motion.div>
    ))}
  </motion.div>
);

const DashboardAnimation = () => (
  <motion.div
    className="w-full h-full flex flex-col gap-3 p-4 overflow-y-auto"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    {/* Today's Schedule */}
    <div className="flex flex-col gap-2 pb-4">
      <div className="flex flex-row justify-between">
        <div className="flex flex-row flex-1 items-baseline gap-2">
          <div className="whitespace-nowrap font-semibold text-lg">今天</div>
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            5月7日 星期三
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm">
          <Cloud size={14} className="text-blue-500" />
          <span className="font-medium">26°</span>
          <span className="text-muted-foreground text-xs">18°</span>
          <div className="ml-1 text-xs bg-gray-200 px-1 rounded-full">10%</div>
        </div>
      </div>

      {/* Class 1 */}
      <div className="flex flex-row gap-2 items-start">
        <div className="size-4 rounded-sm mt-1 bg-nthu-500"></div>
        <div className="flex flex-col gap-1">
          <div className="font-semibold">程式設計</div>
          <div className="text-xs text-muted-foreground align-baseline">
            <Clock className="size-3 inline mr-1" />
            9:00 - 10:00
          </div>
          <div className="text-xs text-muted-foreground align-baseline">
            <MapPin className="size-3 inline mr-1" />
            R201
          </div>
        </div>
      </div>

      {/* Class 2 */}
      <div className="flex flex-row gap-2 items-start">
        <div className="size-4 rounded-sm mt-1 bg-blue-500"></div>
        <div className="flex flex-col gap-1">
          <div className="font-semibold">線性代數</div>
          <div className="text-xs text-muted-foreground align-baseline">
            <Clock className="size-3 inline mr-1" />
            11:00 - 12:00
          </div>
          <div className="text-xs text-muted-foreground align-baseline">
            <MapPin className="size-3 inline mr-1" />
            R301
          </div>
        </div>
      </div>
    </div>

    {/* Tomorrow's Schedule */}
    <div className="flex flex-col gap-2">
      <div className="flex flex-row flex-1 items-baseline gap-2">
        <div className="whitespace-nowrap font-semibold text-lg text-muted-foreground">
          明天
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          5月8日
        </div>
      </div>

      {/* Class for tomorrow */}
      <div className="flex flex-row gap-2 items-start">
        <div className="size-4 rounded-sm mt-1 bg-green-500"></div>
        <div className="flex flex-col gap-1">
          <div className="font-semibold">資料結構</div>
          <div className="text-xs text-muted-foreground align-baseline">
            <Clock className="size-3 inline mr-1" />
            14:00 - 15:00
          </div>
          <div className="text-xs text-muted-foreground align-baseline">
            <MapPin className="size-3 inline mr-1" />
            R401
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

const BusAnimation = () => (
  <motion.div
    className="w-full h-full flex flex-col gap-4 p-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <motion.div
      className="w-full h-8 bg-nthu-100 rounded-t-md flex items-center justify-center"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Bus size={16} className="mr-2 text-nthu-600" />
      <span className="text-sm font-medium">Campus Bus Schedule</span>
    </motion.div>

    <motion.div className="relative flex-1 bg-gray-50 rounded-md overflow-hidden">
      {/* Bus route line */}
      <motion.div
        className="absolute top-1/2 left-0 w-full h-1 bg-gray-300"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1 }}
      />

      {/* Bus stops */}
      {[
        { icon: <GreenLineIcon />, position: "20%" },
        { icon: <RedLineIcon />, position: "40%" },
        { icon: <NandaLineIcon />, position: "60%" },
        { icon: <Bus size={16} className="text-white" />, position: "80%" },
      ].map((stop, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-nthu-500 flex items-center justify-center"
          style={{ left: stop.position }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 + i * 0.2 }}
        >
          {stop.icon}
        </motion.div>
      ))}

      {/* Moving bus */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-8 rounded-full bg-nthu-600 flex items-center justify-center"
        initial={{ left: "0%" }}
        animate={{ left: "80%" }}
        transition={{ duration: 2, repeat: 1, repeatType: "reverse" }}
      >
        <Bus size={16} className="text-white" />
      </motion.div>
    </motion.div>
  </motion.div>
);

const ToolsAnimation = () => (
  <motion.div
    className="w-full h-full grid grid-cols-2 gap-3 p-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    {[
      { icon: <Calendar size={24} />, label: "Calendar" },
      { icon: <Bus size={24} />, label: "Bus Schedule" },
      { icon: <BookOpen size={24} />, label: "Courses" },
      { icon: <Wrench size={24} />, label: "Settings" },
    ].map((tool, i) => (
      <motion.div
        key={i}
        className="flex flex-col items-center justify-center bg-white p-4 rounded-md shadow-sm border"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: i * 0.1 }}
      >
        <motion.div
          className="w-12 h-12 rounded-full bg-nthu-100 flex items-center justify-center mb-2"
          whileHover={{ scale: 1.1 }}
        >
          <motion.div className="text-nthu-600">{tool.icon}</motion.div>
        </motion.div>
        <span className="text-sm font-medium">{tool.label}</span>
      </motion.div>
    ))}
  </motion.div>
);

const Help = ({ children }: { children?: ReactNode }) => {
  const dict = useDictionary();

  const content = [
    {
      component: <IntroAnimation />,
      title: dict.help.intro.title,
      description: dict.help.intro.description,
    },
    {
      component: <CoursesAnimation />,
      title: dict.help.courses.title,
      description: dict.help.courses.description,
    },
    {
      component: <DashboardAnimation />,
      title: dict.help.dashboard.title,
      description: dict.help.dashboard.description,
    },
    {
      component: <BusAnimation />,
      title: dict.help.bus.title,
      description: dict.help.bus.description,
    },
    {
      component: <ToolsAnimation />,
      title: dict.help.tools.title,
      description: dict.help.tools.description,
    },
  ];

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasVisitedBefore, setHasVisitedBefore] = useLocalStorage(
    "hasVisitedBefore",
    false,
  );

  useEffect(() => {
    if (!hasVisitedBefore) {
      setOpen(true);
    }
  }, [hasVisitedBefore]);

  useEffect(() => {
    if (open) {
      setPage(0);
    } else {
      // wait for 2 seconds before setting hasVisitedBefore to true
      const timer = setTimeout(() => {
        setHasVisitedBefore(true);
      }, 2000);
    }
  }, [open]);

  const { signinRedirect } = useAuth();

  const handleLogin = () => {
    // set redirectUri in localStorage to current page
    localStorage.setItem("redirectUri", window.location.pathname);
    signinRedirect();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button
            size="sm"
            variant="outline"
            className="flex gap-1"
            onClick={() => setOpen(true)}
          >
            <HelpCircle size="16" />
            <span className="hidden md:inline-block">Help</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="h-[calc(100dvh-env(safe-area-inset-bottom))] p-0 w-full lg:h-[calc(100vh-48px)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex flex-col items-center gap-8 px-4 py-8 max-h-[calc(100dvh-env(safe-area-inset-bottom))] overflow-y-auto">
          <div className="flex-1 grid place-items-center">
            <div className="w-[254px] h-[254px] max-h-full border rounded-lg shadow-sm overflow-hidden">
              {content[page].component}
            </div>
          </div>
          <div className="flex flex-row justify-center">
            <ProgressDisplay current={page + 1} max={content.length} />
          </div>
          <div className="flex flex-col gap-2 h-max">
            <h1 className="font-bold text-3xl">{content[page].title}</h1>
            <p>{content[page].description}</p>
          </div>
          {page < content.length - 1 ? (
            <Button
              className="w-full"
              onClick={() => {
                setPage(page + 1);
              }}
            >
              {dict.help.continue}
            </Button>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <Button className="w-full" onClick={handleLogin}>
                {dict.help.login}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                {dict.help.skip}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Help;
