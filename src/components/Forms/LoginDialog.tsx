'use client';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useSettings } from "@/hooks/contexts/settings"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ExternalLinkIcon } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import ButtonSpinner from "../Animation/ButtonSpinner";
import useDictionary from "@/dictionaries/useDictionary";
import NTHUModsLogo from "../Branding/NTHUModsLogo";

const LoginPage = ({ onClose }: { onClose: () => void }) => {
  const [studentid, setStudentid] = useState('')
  const [password, setPassword] = useState('')
  const [agreeChecked, setAgreeChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const { language } = useSettings()
  const { setAISCredentials } = useHeadlessAIS();
  const dict = useDictionary();

  const onSubmit = async () => {
    setLoading(true)
    const result = await setAISCredentials(studentid, password)
    if (result) {
      onClose()
    } else {
      setError(dict.ccxp.incorrect_credentials)
    }
    setLoading(false)
  }

  const handleCheckboxChange = (checked: boolean) => {
    setAgreeChecked(checked)
  }

  const allowed = agreeChecked && studentid.trim().length > 0 && password.trim().length > 0

  // listen to enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit()
    }
  }

  return <div className="flex flex-col gap-8" onKeyDown={handleKeyDown}>
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <NTHUModsLogo />
        <h2 className="text-2xl font-bold">Welcome to NTHUMODS</h2>
        <p>登入解鎖完整專屬於你的校園資訊</p>
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
            onChange={(e) => setStudentid(e.target.value)}
          />
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
  </div>
}

const LoginDialog = () => {
  const [open, setOpen] = useState(false);
  const dict = useDictionary();

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button variant="outline">{dict.ccxp.connect}</Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px] h-screen">
      <LoginPage onClose={() => setOpen(false)} />
    </DialogContent>
  </Dialog>

}

export default LoginDialog