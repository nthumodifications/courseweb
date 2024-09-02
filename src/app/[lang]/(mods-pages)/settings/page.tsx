"use client";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { useState } from "react";
import LoginDialog from "@/components/Forms/LoginDialog";
import { TimetableThemeList } from "./TimetableThemeList";
import TimetablePreview from "./TimetablePreview";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Language } from "@/types/settings";
import Footer from "@/components/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TimetablePreferences from "./TimetablePreferences";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GraduationCap, Hash } from "lucide-react";
import ChangePasswordDialog from "@/components/Forms/ChangePasswordDialog";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocalStorage } from "usehooks-ts";
import { Badge } from "@/components/ui/badge";
import { event } from "@/lib/gtag";

const DisplaySettingsCard = () => {
  const { darkMode, setDarkMode, language, setLanguage } = useSettings();
  const dict = useDictionary();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.display.title}</CardTitle>
        <CardDescription>{dict.settings.display.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row gap-4 py-4 items-center" id="darkmode">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.display.dark_mode.title}
            </h2>
          </div>
          <div className="flex items-center">
            <Switch
              checked={darkMode}
              defaultChecked={darkMode}
              onCheckedChange={(e) => setDarkMode(e)}
            />
          </div>
        </div>
        <Separator orientation="horizontal" />
        <div className="flex flex-row gap-4 py-4 items-center" id="language">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.display.language.title}
            </h2>
          </div>
          <div className="flex items-center">
            <Select
              defaultValue={language}
              value={language}
              onValueChange={(v) => setLanguage(v as Language)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">繁體中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TimetableSettingsCard = () => {
  const { preferences, setPreferences } = useUserTimetable();
  const dict = useDictionary();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.timetable.title}</CardTitle>
        <CardDescription>{dict.settings.timetable.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 py-4" id="theme">
          <TimetablePreview />
          <TimetableThemeList />
          <TimetablePreferences
            settings={preferences}
            onSettingsChange={setPreferences}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const CalendarSettingsCard = () => {
  const [useNewCalendar, setUseNewCalendar] = useLocalStorage(
    "use_new_calendar",
    false,
  );
  const { showAcademicCalendar, setShowAcademicCalendar } = useSettings();

  const handleUseNewCalendar = (v: boolean) => {
    setUseNewCalendar(v);
    event({
      action: "use_new_calendar",
      category: "settings",
      label: "calendar_" + v ? "on" : "off",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today Page</CardTitle>
        <CardDescription>What do you wanna see first</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row gap-4 py-4" id="calendar">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">NTHU Academic Calendar</h2>
            <p className="text-sm text-muted-foreground">
              Show Academic Calendar on the Today Page.
            </p>
          </div>
          <div className="flex items-center">
            <Switch
              checked={showAcademicCalendar}
              onCheckedChange={setShowAcademicCalendar}
            />
          </div>
        </div>
        <div className="flex flex-row gap-4 py-4" id="calendar">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              Calendar <Badge variant="outline">Experimental</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Use the new Calendar on the Today Page.
            </p>
          </div>
          <div className="flex items-center">
            <Switch
              checked={useNewCalendar}
              defaultChecked={useNewCalendar}
              onCheckedChange={handleUseNewCalendar}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AccountInfoSettingsCard = () => {
  const { user, ais, signOut } = useHeadlessAIS();
  const dict = useDictionary();
  const [openChangePassword, setOpenChangePassword] = useState(false);

  return (
    <Card id="account">
      <CardHeader>
        <CardTitle>{dict.settings.account.title}</CardTitle>
        <CardDescription>{dict.settings.account.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {user && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">{user.name_zh}</h2>
                <h3 className="text-sm">{user.name_en}</h3>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-gray-500 flex flex-row text-sm">
                  <GraduationCap className="w-4 h-4 mr-2" /> {user.department}
                </div>
                <div className="text-gray-500 flex flex-row text-sm">
                  <Hash className="w-4 h-4 mr-2" /> {user.studentid}
                </div>
              </div>
            </div>
            <div className="flex flex-row justify-end items-center w-full gap-2">
              <ChangePasswordDialog
                open={openChangePassword}
                setOpen={setOpenChangePassword}
              >
                <Button variant={"ghost"}>更新密碼</Button>
              </ChangePasswordDialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    {dict.settings.account.signout}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Logout?</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to log out?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={() => signOut()}>
                      {dict.settings.account.signout}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
        <div
          className={cn("flex flex-row gap-4 py-4", user ? "hidden" : "")}
          id="account"
        >
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.account.ccxp.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {dict.settings.account.ccxp.description}
            </p>
          </div>
          <div className="flex flex-col justify-center items-center space-y-2 w-max">
            <LoginDialog />
            {ais.enabled && (
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                {dict.ccxp.connected}
              </span>
            )}
            {ais.enabled && !ais.ACIXSTORE && (
              <span className="text-red-600 dark:text-red-400 text-sm">
                {dict.ccxp.failed}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PrivacySettingsCard = () => {
  const { analytics, setAnalytics } = useSettings();
  const dict = useDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.privacy.title}</CardTitle>
        <CardDescription>{dict.settings.privacy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row gap-4 py-4" id="privacy">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.privacy.analytics.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {dict.settings.privacy.analytics.description}
            </p>
          </div>
          <div className="flex flex-col justify-center items-center space-y-2">
            <Switch
              checked={analytics}
              defaultChecked={analytics}
              onCheckedChange={(e) => setAnalytics(e)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SettingsPage = () => {
  return (
    <div className="flex flex-col max-w-2xl px-4 gap-4">
      <AccountInfoSettingsCard />
      <DisplaySettingsCard />
      <CalendarSettingsCard />
      <TimetableSettingsCard />
      <PrivacySettingsCard />
      <Footer />
    </div>
  );
};

export default SettingsPage;
