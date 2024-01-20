import { useSettings } from "@/hooks/contexts/settings"
import { useModal } from "@/hooks/contexts/useModal"
import { Button, DialogActions, DialogContent, DialogTitle, Input, ModalClose, ModalDialog } from "@mui/joy";
import { useState } from "react";
import useDictionary from '@/dictionaries/useDictionary';
import LoginDialog from "@/components/Forms/LoginDialog";
import CCXPDownAlert from '@/components/CCXPDownAlert';

const Tools = () => {
  const dict = useDictionary();
  const { ais } = useSettings();

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
        <LoginDialog />
      </div>
      {ais.enabled && <span className="text-gray-600 dark:text-gray-400 text-sm">已連接</span>}
      {ais.enabled && !ais.ACIXSTORE && <span className="text-red-600 dark:text-red-400 text-sm">連接著/登入異常</span>}
    </div>
  )
}

export default Tools