import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { MoreHorizontal } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { ConfirmedActionMenuItem } from "../ConfirmedActionMenuItem";
import {
  getSpaceErrorMessage,
  downloadBookingsCsv,
  useArchiveSpace,
  useCreateOrganisation,
  useUpdateOrganisation,
  type Organisation,
} from "../api";
import { MembersPanel } from "./members-panel";
import { RequestsQueue } from "./requests-queue";
import { SpaceCreateForm, SpaceRulesEditor } from "./space-rules-editor";
import { WeekView } from "./week-view";
import { statusText } from "./shared";

export const CreateOrganisation = ({ open = false }: { open?: boolean }) => {
  const dict = useDictionary();
  const create = useCreateOrganisation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [webhook, setWebhook] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    setError("");
    try {
      await create.mutateAsync({
        input: undefined,
        body: {
          name,
          slug,
          description,
          contact,
          discordWebhookUrl: webhook || null,
        },
      });
      setName("");
      setSlug("");
      setDescription("");
      setContact("");
      setWebhook("");
    } catch (error) {
      setError(getSpaceErrorMessage(error, dict.spaces));
    }
  };
  return (
    <details className="border-b border-border py-3" open={open}>
      <summary className="cursor-pointer font-medium">
        {dict.spaces.createOrganisation}
      </summary>
      <div className="flex flex-col gap-3 py-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.organisationName}</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.organisationSlug}</span>
          <Input
            value={slug}
            onChange={(event) =>
              setSlug(
                event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]+/gu, "-")
                  .replace(/^-|-$/gu, ""),
              )
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.description}</span>
          <textarea
            className="min-h-20 rounded-md border border-border bg-background px-3 py-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.contact}</span>
          <Input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.discordWebhook}</span>
          <Input
            type="url"
            value={webhook}
            onChange={(event) => setWebhook(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          className="w-fit"
          size="sm"
          disabled={
            create.isPending || !name.trim() || !slug.trim() || !contact.trim()
          }
          onClick={() => void submit()}
        >
          {dict.spaces.create}
        </Button>
      </div>
    </details>
  );
};

const ManageOrganisation = ({
  organisation,
}: {
  organisation: Organisation;
}) => {
  const dict = useDictionary();
  const auth = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const canManage =
    organisation.role === "OWNER" || organisation.role === "MANAGER";
  const updateOrganisation = useUpdateOrganisation();
  const archive = useArchiveSpace();
  const [webhook, setWebhook] = useState("");
  const [error, setError] = useState("");
  const spaces = organisation.spaces ?? [];
  useEffect(
    () => setWebhook(organisation.discordWebhookUrl ?? ""),
    [organisation.discordWebhookUrl],
  );
  const download = async () => {
    try {
      const blob = await downloadBookingsCsv(
        organisation.id,
        auth.user?.access_token ?? "",
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "space-bookings.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(getSpaceErrorMessage(error, dict.spaces));
    }
  };
  return (
    <section className="flex flex-col border-b border-border py-4">
      <div className="flex flex-row flex-wrap items-baseline gap-3">
        <h2 className="font-bold">{organisation.name}</h2>
        <span className="text-sm text-muted-foreground">
          {organisation.role === "OWNER"
            ? dict.spaces.owner
            : organisation.role === "MANAGER"
              ? dict.spaces.manager
              : dict.spaces.approver}
        </span>
        <span className="flex-1" />
        <span className="whitespace-nowrap text-sm font-medium">
          {statusText(organisation.status, dict)}
        </span>
      </div>
      <div className="flex flex-row flex-wrap gap-2 py-3">
        <Button asChild size="sm" variant="outline">
          <Link to={`/${lang}/spaces`}>{dict.spaces.browse}</Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void download()}
          disabled={!auth.user?.access_token}
        >
          {dict.spaces.exportCsv}
        </Button>
      </div>
      {canManage && (
        <>
          <div className="flex flex-col gap-2 border-t border-border py-3">
            <h3 className="font-medium">{dict.spaces.discordWebhook}</h3>
            <div className="flex flex-row gap-2">
              <Input
                type="url"
                value={webhook}
                onChange={(event) => setWebhook(event.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={updateOrganisation.isPending}
                onClick={async () => {
                  setError("");
                  try {
                    await updateOrganisation.mutateAsync({
                      input: organisation.id,
                      body: { discordWebhookUrl: webhook || null },
                    });
                  } catch (error) {
                    setError(getSpaceErrorMessage(error, dict.spaces));
                  }
                }}
              >
                {dict.spaces.save}
              </Button>
            </div>
          </div>
        </>
      )}
      <MembersPanel organisation={organisation} />
      <div className="border-t border-border py-3">
        <h3 className="font-medium">{dict.spaces.spaces}</h3>
        {spaces.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {dict.spaces.emptySpaces}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {spaces.map((space) => (
              <div key={space.id} className="py-2">
                <div className="flex flex-row items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-medium hover:text-primary"
                      to={`/${lang}/spaces/${organisation.slug}/${space.slug}`}
                    >
                      {space.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {space.location} ・{" "}
                      {space.isPublic
                        ? dict.spaces.public
                        : dict.spaces.private}
                    </div>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          aria-label={`${dict.spaces.moreActions}: ${space.name}`}
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ConfirmedActionMenuItem
                          label={dict.spaces.archive}
                          description={dict.spaces.archiveConfirm}
                          confirmLabel={dict.spaces.archive}
                          cancelLabel={dict.spaces.cancel}
                          disabled={archive.isPending}
                          onConfirm={async () => {
                            try {
                              await archive.mutateAsync({ input: space.id });
                            } catch (error) {
                              setError(
                                getSpaceErrorMessage(error, dict.spaces),
                              );
                            }
                          }}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {canManage && <SpaceRulesEditor key={space.id} space={space} />}
              </div>
            ))}
          </div>
        )}
        {canManage && <SpaceCreateForm organisationId={organisation.id} />}
      </div>
      <div className="border-t border-border">
        <RequestsQueue organisationId={organisation.id} />
        <WeekView organisation={organisation} spaces={spaces} />
      </div>
      {error && (
        <p role="alert" className="py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
};

export const OrganisationList = ({
  organisations,
}: {
  organisations: Organisation[];
}) => {
  const dict = useDictionary();
  return (
    <>
      {organisations.length === 0 ? (
        <>
          <CreateOrganisation open />
          <p className="py-4 text-sm text-muted-foreground">
            {dict.spaces.emptySpaces}
          </p>
        </>
      ) : (
        <>
          {organisations.map((organisation) => (
            <ManageOrganisation
              key={organisation.id}
              organisation={organisation}
            />
          ))}
          <CreateOrganisation />
        </>
      )}
    </>
  );
};
