import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Checkbox,
  Label,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

interface AccountLogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keepLocalData: boolean;
  onKeepLocalDataChange: (keepLocalData: boolean) => void;
  onConfirm: () => void;
}

export const AccountLogoutDialog = ({
  open,
  onOpenChange,
  keepLocalData,
  onKeepLocalDataChange,
  onConfirm,
}: AccountLogoutDialogProps) => {
  const dict = useDictionary();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dict.settings.account.logoutConfimation}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dict.settings.account.logoutDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="keepData"
            checked={keepLocalData}
            onCheckedChange={(checked) => onKeepLocalDataChange(!!checked)}
          />
          <Label htmlFor="keepData">
            {dict.settings.account.keepLocalData}
          </Label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground"
          >
            {dict.settings.account.logout}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
