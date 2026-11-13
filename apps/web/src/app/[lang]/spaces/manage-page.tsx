import { Link, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useManageOrganisations } from "./api";
import { OrganisationList } from "./manage/organisation-list";

const SignInPrompt = () => {
  const dict = useDictionary();
  const auth = useAuth();
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-4">
      <h1 className="font-bold">{dict.spaces.manage}</h1>
      <p className="text-sm text-muted-foreground">
        {dict.spaces.signInPrompt}
      </p>
      <Button size="sm" onClick={() => void auth.signinRedirect()}>
        {dict.spaces.signIn}
      </Button>
    </div>
  );
};

const ManageSpacesPage = () => {
  const dict = useDictionary();
  const auth = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const query = useManageOrganisations();
  if (!auth.isAuthenticated) return <SignInPrompt />;
  if (query.isLoading)
    return (
      <p className="px-4 py-4 text-sm text-muted-foreground">
        {dict.spaces.loading}
      </p>
    );
  if (query.error)
    return (
      <div className="flex flex-col gap-2 px-4 py-4 text-sm">
        <p className="text-destructive">{dict.spaces.error}</p>
        <Button
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => void query.refetch()}
        >
          {dict.spaces.tryAgain}
        </Button>
      </div>
    );
  return (
    <div className="flex flex-col px-4">
      <div className="flex flex-row flex-wrap items-center gap-3 py-2">
        <h1 className="flex-1 font-bold">{dict.spaces.manage}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to={`/${lang}/spaces`}>{dict.spaces.browse}</Link>
        </Button>
      </div>
      <OrganisationList organisations={query.data?.organisations ?? []} />
      <div className="h-6" />
    </div>
  );
};

export default ManageSpacesPage;
