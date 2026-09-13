import { Edit2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

const ShortNameContributeForm = () => {
  const dict = useDictionary();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{dict.dialogs.ShortNameContributeForm.title}</h1>
        <p className="text-sm text-muted-foreground">
          {dict.dialogs.ShortNameContributeForm.description}
        </p>
      </div>
      <Alert>
        <Edit2 className="h-4 w-4" />
        <AlertTitle>{dict.dialogs.ShortNameContributeForm.dont_abuse}</AlertTitle>
        <AlertDescription>
          <p>{dict.dialogs.ShortNameContributeForm.accurate_relevant}</p>
          <p>{dict.dialogs.ShortNameContributeForm.privacy}</p>
        </AlertDescription>
      </Alert>
      <Input placeholder={dict.dialogs.ShortNameContributeForm.placeholder} />
      <div className="flex flex-row gap-2 justify-end">
        <Button variant="outline">{dict.dialogs.ShortNameContributeForm.cancel}</Button>
        <Button>{dict.dialogs.ShortNameContributeForm.submit}</Button>
      </div>
    </div>
  );
};

export default ShortNameContributeForm;
