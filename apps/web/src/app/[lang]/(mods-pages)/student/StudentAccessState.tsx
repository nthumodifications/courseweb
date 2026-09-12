import { BadgeAlert, LogIn } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { EmptyState, Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

type StudentAccessStateProps = {
  title: string;
  description: string;
};

export default function StudentAccessState({
  title,
  description,
}: StudentAccessStateProps) {
  const { signinRedirect } = useAuth();
  const dict = useDictionary();

  const handleSignIn = () => {
    localStorage.setItem("redirectUri", window.location.pathname);
    void signinRedirect();
  };

  return (
    <EmptyState
      icon={BadgeAlert}
      title={title}
      description={description}
      action={
        <Button type="button" onClick={handleSignIn}>
          <LogIn aria-hidden="true" />
          {dict.settings.account.signin}
        </Button>
      }
    />
  );
}
