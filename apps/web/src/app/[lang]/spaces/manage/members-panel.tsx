import { useState } from "react";
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
  useAddOrganisationMember,
  useRemoveOrganisationMember,
  type Organisation,
} from "../api";

type OrganisationRole = NonNullable<Organisation["role"]>;
type OrganisationMember = NonNullable<Organisation["members"]>[number];

export const canRemoveOrganisationMember = ({
  viewerId,
  viewerRole,
  member,
  ownerCount,
}: {
  viewerId?: string;
  viewerRole?: OrganisationRole;
  member: OrganisationMember;
  ownerCount: number;
}) => {
  if (!viewerId || !viewerRole) return false;
  if (member.role === "OWNER" && ownerCount <= 1) return false;
  if (member.user.userId === viewerId) return true;
  return (
    viewerRole === "OWNER" ||
    (viewerRole === "MANAGER" && member.role === "APPROVER")
  );
};

export const OrganisationMemberRow = ({
  member,
  viewerId,
  viewerRole,
  ownerCount,
  labels,
  onRemove,
  removePending = false,
}: {
  member: OrganisationMember;
  viewerId?: string;
  viewerRole?: OrganisationRole;
  ownerCount: number;
  labels: {
    owner: string;
    manager: string;
    approver: string;
    remove: string;
    removeConfirm: string;
    cancel: string;
    moreActions: string;
  };
  onRemove: () => Promise<void>;
  removePending?: boolean;
}) => {
  const canRemove = canRemoveOrganisationMember({
    viewerId,
    viewerRole,
    member,
    ownerCount,
  });
  const canSeeEmail = viewerRole === "OWNER" || viewerRole === "MANAGER";
  const roleLabel =
    member.role === "OWNER"
      ? labels.owner
      : member.role === "MANAGER"
        ? labels.manager
        : labels.approver;

  return (
    <div className="flex flex-row items-center gap-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <span className="font-medium">{member.user.name}</span>
        <span className="text-muted-foreground">
          {" "}
          ・ {member.user.userId}
          {canSeeEmail && ` ・ ${member.user.email}`}
        </span>
      </div>
      <span className="whitespace-nowrap">{roleLabel}</span>
      {canRemove && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label={`${labels.moreActions}: ${member.user.name}`}
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ConfirmedActionMenuItem
              label={labels.remove}
              description={labels.removeConfirm}
              confirmLabel={labels.remove}
              cancelLabel={labels.cancel}
              disabled={removePending}
              onConfirm={onRemove}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export const MemberRoleSelect = ({
  viewerRole,
  value,
  onChange,
  labels,
}: {
  viewerRole?: OrganisationRole;
  value: "MANAGER" | "APPROVER";
  onChange: (value: "MANAGER" | "APPROVER") => void;
  labels: { manager: string; approver: string };
}) => (
  <select
    className="min-h-10 rounded-md border border-border bg-background px-3"
    value={value}
    onChange={(event) => onChange(event.target.value as "MANAGER" | "APPROVER")}
  >
    {viewerRole === "OWNER" && (
      <option value="MANAGER">{labels.manager}</option>
    )}
    <option value="APPROVER">{labels.approver}</option>
  </select>
);

export const MembersPanel = ({
  organisation,
}: {
  organisation: Organisation;
}) => {
  const dict = useDictionary();
  const auth = useAuth();
  const addMember = useAddOrganisationMember();
  const removeMember = useRemoveOrganisationMember();
  const [identifier, setIdentifier] = useState("");
  const [memberRole, setMemberRole] = useState<"MANAGER" | "APPROVER">(
    "APPROVER",
  );
  const [error, setError] = useState("");
  const viewerRole = organisation.role;
  const viewerId = auth.user?.profile.sub;
  const canManageMembers = viewerRole === "OWNER" || viewerRole === "MANAGER";
  const members = organisation.members ?? [];
  const ownerCount = members.filter((member) => member.role === "OWNER").length;

  return (
    <div className="flex flex-col gap-2 border-t border-border py-3">
      <h3 className="font-medium">{dict.spaces.members}</h3>
      <div className="flex flex-col divide-y divide-border">
        {members.map((member) => (
          <OrganisationMemberRow
            key={member.user.userId}
            member={member}
            viewerId={viewerId}
            viewerRole={viewerRole}
            ownerCount={ownerCount}
            labels={dict.spaces}
            removePending={removeMember.isPending}
            onRemove={async () => {
              setError("");
              try {
                await removeMember.mutateAsync({
                  input: {
                    organisationId: organisation.id,
                    userId: member.user.userId,
                  },
                });
              } catch (removeError) {
                setError(getSpaceErrorMessage(removeError, dict.spaces));
              }
            }}
          />
        ))}
      </div>
      {canManageMembers && (
        <>
          <div className="flex flex-row flex-wrap gap-2">
            <Input
              className="min-w-48 flex-1"
              placeholder={dict.spaces.memberIdentifier}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
            <MemberRoleSelect
              viewerRole={viewerRole}
              value={memberRole}
              onChange={setMemberRole}
              labels={dict.spaces}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={addMember.isPending || !identifier.trim()}
              onClick={async () => {
                setError("");
                try {
                  await addMember.mutateAsync({
                    input: organisation.id,
                    body: { userIdentifier: identifier, role: memberRole },
                  });
                  setIdentifier("");
                } catch (addError) {
                  setError(getSpaceErrorMessage(addError, dict.spaces));
                }
              }}
            >
              {dict.spaces.addMember}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </>
      )}
      {!canManageMembers && error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
