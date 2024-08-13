import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const CCXPDownAlert = () => {
  return (
    <Alert>
      <AlertTriangle />
      <AlertTitle>代理登入暫停</AlertTitle>
      <AlertDescription>
        由於人手吃緊，因此代理登入的功能目前暫停使用。更多的資訊可以到我們的IG
        @nthumods上查看
      </AlertDescription>
    </Alert>
  );
};

export default CCXPDownAlert;
