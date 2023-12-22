'use client';
import { useSettings } from "@/hooks/contexts/settings";
import { Button, Checkbox, DialogActions, DialogContent, DialogTitle, Input, ModalClose, ModalDialog } from "@mui/joy";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export const HeadlessLoginDialog = ({ onClose }: { onClose: () => void; }) => {
    const [studentid, setStudentid] = useState('');
    const [password, setPassword] = useState('');
    const [agreeChecked, setAgreeChecked] = useState(false);
    const { language, setAISCredentials } = useSettings();

    const onSubmit = () => {
        setAISCredentials(studentid, password);
        onClose();
    };

    const onCancel = () => {
        setAISCredentials(undefined, undefined);
        onClose();
    };

    const allowed = agreeChecked && studentid.trim().length > 0 && password.trim().length > 0;

    return <ModalDialog>
        <DialogTitle>
            連接校務資訊系統
        </DialogTitle>
        <ModalClose />
        <DialogContent>
            <p className="text-base">
                <span className="text-red-500">注意：你的學號和密碼僅會儲存在你的設備中，不會儲存在伺服器上。</span>
                <br/>
                每15分鐘，網站會重新登入校務資訊系統，並把學號和密碼傳到該伺服器進行身份驗證，傳輸過程會使用HTTPS加密連線，並且在驗證完畢后立即刪除。
                <br/>
                <Button size="sm" variant="soft" component="a" href={`/${language}/privacy-policy`} target="_blank" endDecorator={<ExternalLinkIcon/>} >隱私權政策</Button>
            </p>
            <div className="flex flex-col gap-2">
                <Input placeholder="學號" name="studentid" value={studentid} onChange={(e) => setStudentid(e.target.value)}/>
                <Input placeholder="密碼" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Checkbox 
                label={<span>我同意本網站的隱私權政策及理解代理登入的方法</span>} 
                checked={agreeChecked} 
                onChange={(e) => setAgreeChecked(e.target.checked)} 
            />

        </DialogContent>
        <DialogActions>
            <Button variant="outlined" color="success" onClick={onSubmit} disabled={!allowed}>連接</Button>
            <Button variant="outlined" color="danger" onClick={onCancel}>取消</Button>
        </DialogActions>
    </ModalDialog>;
};
