import { Alert, AlertDescription, AlertTitle } from "@courseweb/ui";
import { AlertTriangle } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

const CCXPDownAlert = () => {
  const dict = useDictionary();

  return (
    <Alert>
      <AlertTriangle />
      <AlertTitle>{dict.ccxp.suspended_title}</AlertTitle>
      <AlertDescription>{dict.ccxp.suspended_description}</AlertDescription>
    </Alert>
  );
};

export default CCXPDownAlert;
