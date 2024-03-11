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

const LoginDialog = () => {
  const [open, setOpen] = useState(false)
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
      setOpen(false)
    } else {
      setError(dict.ccxp.incorrect_credentials)
    }
    setLoading(false)
  }

  const onCancel = () => {
    setAISCredentials(undefined, undefined)
    setOpen(false)
  }

  const handleCheckboxChange = (checked: boolean) => {
    setAgreeChecked(checked)
  }

  const allowed = agreeChecked && studentid.trim().length > 0 && password.trim().length > 0

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button variant="outline">{dict.ccxp.connect}</Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>
          {dict.ccxp.login.title}
        </DialogTitle>
        <DialogDescription>
          <span className="text-red-500">
            {dict.ccxp.login.disclaimer}
          </span>
          {dict.ccxp.login.description}
          <Button size="sm" variant="secondary" className="mt-2" asChild>
            <Link href={`/${language}/privacy-policy`} target="_blank" className="flex gap-2">
              <ExternalLinkIcon size="16"/>
              {dict.privacy_policy}
            </Link>
          </Button>
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">
            {dict.ccxp.studentid}
          </Label>
          <Input
            className="col-span-3"
            name="studentid"
            value={studentid}
            onChange={(e) => setStudentid(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">
            {dict.ccxp.password}
          </Label>
          <Input
            className="col-span-3"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="items-center gap-2 flex">
          <Checkbox checked={agreeChecked} onCheckedChange={handleCheckboxChange} />
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {dict.ccxp.login.agree}
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onCancel} variant="outline">{dict.cancel}</Button>
        <Button onClick={onSubmit} disabled={!allowed || loading}>{loading? <ButtonSpinner/>: dict.ccxp.connect}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}

export default LoginDialog