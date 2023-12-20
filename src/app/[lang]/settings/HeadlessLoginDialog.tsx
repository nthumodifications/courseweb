'use client';
import { useSettings } from "@/hooks/contexts/settings";
import { Button, DialogActions, DialogContent, DialogTitle, Input, ModalClose, ModalDialog } from "@mui/joy";
import { useState } from "react";

export const HeadlessLoginDialog = ({ onClose }: { onClose: () => void; }) => {
    const [studentid, setStudentid] = useState('');
    const [password, setPassword] = useState('');
    const { setAISCredentials } = useSettings();

    const onSubmit = () => {
        setAISCredentials(studentid, password);
        onClose();
    };

    const onCancel = () => {
        setAISCredentials(undefined, undefined);
        onClose();
    };

    return <ModalDialog>
        <DialogTitle>
            連接校務資訊系統
        </DialogTitle>
        <ModalClose />
        <DialogContent>
            <p>
                學號密碼僅會用於登入校務資訊系統，並只會儲存在本地端，傳輸過程會使用HTTPS加密連線。
            </p>
            <div className="flex flex-col gap-2">
                <Input placeholder="學號" name="studentid" value={studentid} onChange={(e) => setStudentid(e.target.value)} />
                <Input placeholder="密碼" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
        </DialogContent>
        <DialogActions>
            <Button variant="outlined" color="success" onClick={onSubmit}>連接</Button>
            <Button variant="outlined" color="danger" onClick={onCancel}>取消</Button>
        </DialogActions>
    </ModalDialog>;
};
