import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@courseweb/ui";
import { AIPreferencesPanel } from "@/app/[lang]/(mods-pages)/settings/AIPreferences";
import { Settings } from "lucide-react";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

interface AISettingsDialogProps {
  trigger?: React.ReactNode;
}

export function AISettingsDialog({ trigger }: AISettingsDialogProps) {
  const dict = useDictionary();

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" title={dict.settings.ai.title}>
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dict.settings.ai.title}</DialogTitle>
          <DialogDescription>{dict.settings.ai.description}</DialogDescription>
        </DialogHeader>
        <AIPreferencesPanel />
      </DialogContent>
    </Dialog>
  );
}
