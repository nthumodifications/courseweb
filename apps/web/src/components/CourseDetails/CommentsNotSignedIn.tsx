import { AlertTriangle } from "lucide-react";
import { Button } from "@courseweb/ui";
import { Link } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";

const CommentsNotSignedIn = () => {
  const dict = useDictionary();
  return (
    <div className=" flex items-center space-x-4 rounded-md border p-4">
      <AlertTriangle />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">
          登入后即可查看和發表評價。
        </p>
        <p className="text-sm text-muted-foreground">
          分享你的修課經驗，幫助其他同學做決定。
        </p>
      </div>
      <Button asChild>
        <Link to="/settings#account">{dict.settings.account.signin}</Link>
      </Button>
    </div>
  );
};

export default CommentsNotSignedIn;
