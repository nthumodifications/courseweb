import { AlertTriangle } from "lucide-react";
import { Button } from "@courseweb/ui";
import { Link, useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";

const CommentsNotSignedIn = () => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  return (
    <div className=" flex items-center space-x-4 rounded-md border p-4">
      <AlertTriangle />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">
          {dict.course.details.comments_signin_title}
        </p>
        <p className="text-sm text-muted-foreground">
          {dict.course.details.comments_signin_description}
        </p>
      </div>
      <Button asChild>
        <Link to={`/${lang}/settings#account`}>
          {dict.settings.account.signin}
        </Link>
      </Button>
    </div>
  );
};

export default CommentsNotSignedIn;
