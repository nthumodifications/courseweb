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

const LoginDialog = () => {
  const [open, setOpen] = useState(false)
  const [studentid, setStudentid] = useState('')
  const [password, setPassword] = useState('')
  const [agreeChecked, setAgreeChecked] = useState(false)
  const { language } = useSettings()
  const { setAISCredentials } = useHeadlessAIS();

  const onSubmit = () => {
    setAISCredentials(studentid, password)
    setOpen(false)
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
      <Button variant="outline">連接</Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>
          連接校務資訊系統
        </DialogTitle>
        <DialogDescription>
          <span className="text-red-500">
            注意：你的學號和密碼僅會儲存在你的設備中，不會儲存在伺服器上。
          </span>
          每15分鐘，網站會重新登入校務資訊系統，並把學號和密碼傳到該伺服器進行身份驗證，傳輸過程會使用HTTPS加密連線，並且在驗證完畢后立即刪除。
          <Button size="sm" variant="secondary" className="mt-2" asChild>
            <Link href={`/${language}/privacy-policy`} target="_blank" className="flex gap-2">
              <ExternalLinkIcon size="16"/>
              隱私權政策
            </Link>
          </Button>
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">
            學號
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
            密碼
          </Label>
          <Input
            className="col-span-3"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="items-center gap-2 flex">
          <Checkbox checked={agreeChecked} onCheckedChange={handleCheckboxChange} />
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            我同意本網站的隱私權政策及理解代理登入的方法
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onCancel} variant="outline">取消</Button>
        <Button onClick={onSubmit} disabled={!allowed}>連接</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}

export default LoginDialog