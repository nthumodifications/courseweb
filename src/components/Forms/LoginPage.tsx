'use client';
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/contexts/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import ButtonSpinner from "../Animation/ButtonSpinner";
import useDictionary from "@/dictionaries/useDictionary";
import NTHUModsLogo from "../Branding/NTHUModsLogo";
import FullLogo from "../Branding/FullLogo";
import HeadlessSyncCourseButton from "../Timetable/HeadlessSyncCourseButton";
import { Separator } from "../ui/separator";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { cn } from "@/lib/utils";

const WelcomeUserPage = ({ onClose }: { onClose: () => void; }) => {
  const { user } = useHeadlessAIS();
  const { isCoursesEmpty } = useUserTimetable();

  if (!user) throw new Error("User not found");

  return <div className="flex flex-col gap-8 w-full">
    <div className="flex flex-col gap-2 w-full pt-2">
      <div className="flex flex-row items-center gap-2">
        <NTHUModsLogo />
        <FullLogo />
      </div>
      <div className="flex flex-col gap-6 w-full">
        <p>{user.studentid} {user.department}</p>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{user.name_zh}</h2>
          <h3>{user.name_en}</h3>
        </div>
      </div>
    </div>
    <Separator />
    {/* Actions */}
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">開始體驗</h2>
      <div className={cn("flex flex-row gap-2 border border-border rounded-md p-2 items-center", isCoursesEmpty ? '': 'line-through opacity-30')}>
        <div className="flex flex-col flex-1 gap-2">
          <h4 className="font-semibold">同步您的課表</h4>
        </div>
        <HeadlessSyncCourseButton />
      </div>
    </div>
      
    <Button onClick={onClose}>繼續</Button>
  </div>;

}

export const LoginPage = ({ onClose }: { onClose: () => void; }) => {
  const [studentid, setStudentid] = useState('');
  const [password, setPassword] = useState('');
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const { user, setAISCredentials } = useHeadlessAIS();
  const dict = useDictionary();

  const onSubmit = async () => {
    setLoading(true);
    const result = await setAISCredentials(studentid, password);
    if (!result) {
      setError(dict.ccxp.incorrect_credentials);
    }
    setLoading(false);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setAgreeChecked(checked);
  };

  const allowed = agreeChecked && studentid.trim().length > 0 && password.trim().length > 0;

  // listen to enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return <>
    {user ? <WelcomeUserPage onClose={onClose} />:
    <div className="flex flex-col gap-8" onKeyDown={handleKeyDown}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 items-center">
          <NTHUModsLogo />
          <h2 className="text-2xl font-bold text-center">Welcome to NTHUMODS</h2>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label className="">
              {dict.ccxp.studentid}
            </Label>
            <Input
              className="w-full"
              name="studentid"
              disabled={loading}
              value={studentid}
              placeholder="113010001"
              onChange={(e) => setStudentid(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="">
              {dict.ccxp.password}
            </Label>
            <Input
              className="col-span-3"
              name="password"
              type="password"
              disabled={loading}
              placeholder="請輸入校務資訊系統密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="items-center gap-2 flex">
            <Checkbox checked={agreeChecked} onCheckedChange={handleCheckboxChange} disabled={loading} />
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {dict.ccxp.login.agree}
            </label>
          </div>
        </div>
      </div>
      <Button onClick={onSubmit} disabled={!allowed || loading}>{loading ? <ButtonSpinner /> : dict.settings.account.signin}</Button>
    </div>}
  </> 
};
