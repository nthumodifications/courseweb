import { useSettings } from "@/hooks/contexts/settings"
import { useModal } from "@/hooks/contexts/useModal"
import { Button, DialogActions, DialogContent, DialogTitle, Input, ModalClose, ModalDialog } from "@mui/joy";
import { useState } from "react";
import useDictionary from '@/dictionaries/useDictionary';
import { HeadlessLoginDialog } from "../Forms/HeadlessLoginDialog";
import CCXPDownAlert from '@/components/CCXPDownAlert';

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
        {/* <CCXPDownAlert/> */}
        <Button variant="outlined" color="neutral" onClick={handleOpenHeadlessLogin}>
          {dict.help.tools.connect}
        </Button>
      </div>
      {ais.enabled && <span className="text-gray-600 dark:text-gray-400 text-sm">已連接</span>}
      {ais.enabled && !ais.ACIXSTORE && <span className="text-red-600 dark:text-red-400 text-sm">連接著/登入異常</span>}
    </div>
  )
}

export default Tools