import { useSettings } from "@/hooks/contexts/settings"
import { useModal } from "@/hooks/contexts/useModal"
import { Button, DialogActions, DialogContent, DialogTitle, Input, ModalClose, ModalDialog } from "@mui/joy";
import { useState } from "react";
import useDictionary from '@/dictionaries/useDictionary';
  
const HeadlessLoginDialog = ({ onClose }: { onClose: () => void}) => {
    const [studentid, setStudentid] = useState('');
    const [password, setPassword] = useState('');
    const { setAISCredentials } = useSettings();
     
    const onSubmit = () => {
        setAISCredentials(studentid, password);
        onClose();
    }

    const onCancel = () => {
        setAISCredentials(undefined, undefined);
        onClose();
    }

    return <ModalDialog>
        <DialogTitle>
            連接校務資訊系統
        </DialogTitle>
        <ModalClose/>
        <DialogContent>
            <p>
                學號密碼僅會用於登入校務資訊系統，並只會儲存在本地端，傳輸過程會使用HTTPS加密連線。
            </p>
            <div className="flex flex-col gap-2">
                <Input placeholder="學號" name="studentid" value={studentid} onChange={(e) => setStudentid(e.target.value)}/>
                <Input placeholder="密碼" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}/>
            </div>
        </DialogContent>
        <DialogActions>
            <Button variant="outlined" color="success" onClick={onSubmit}>連接</Button>
            <Button variant="outlined" color="danger" onClick={onCancel}>取消</Button>
        </DialogActions>
    </ModalDialog>
}

const Tools = () => {

  const dict = useDictionary();
  const { ais } = useSettings();
  const [openModal, closeModal] = useModal();

  const handleOpenHeadlessLogin = () => {
      openModal({
          children: <HeadlessLoginDialog onClose={closeModal}/>,
      })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center mb-4">
        <img src="/images/toolbox.gif" className="w-48 h-48" />
      </div>
      <span className="font-bold text-2xl">
        {dict.help.tools.title}
      </span>
      <span className="">
        {dict.help.tools.description}
      </span>
      <div>
        <Button variant="outlined" color="neutral" onClick={handleOpenHeadlessLogin}>
          {dict.help.tools.connect}
        </Button>
      </div>
      {ais.enabled && <span className="text-gray-600 dark:text-gray-400 text-sm">已連接</span>}
      {ais.enabled && !ais.ACIXSTORE && <span className="text-red-600 dark:text-red-400 text-sm">登入失敗</span>}
    </div>
  )
}

export default Tools