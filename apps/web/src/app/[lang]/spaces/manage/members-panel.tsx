import { useState } from "react";
import { Button, Input } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  getSpaceErrorMessage,
  useAddOrganisationMember,
  useRemoveOrganisationMember,
  type Organisation,
} from "../api";

export const MembersPanel = ({
  organisation,
}: {
  organisation: Organisation;
}) => {
  const dict = useDictionary();
  const addMember = useAddOrganisationMember();
  const removeMember = useRemoveOrganisationMember();
  const [identifier, setIdentifier] = useState("");
  const [memberRole, setMemberRole] = useState<"MANAGER" | "APPROVER">(
    "APPROVER",
  );
  const [error, setError] = useState("");
  const isOwner = organisation.role === "OWNER";
  return (
    <div className="flex flex-col gap-2 border-t border-border py-3">
      <h3 className="font-medium">{dict.spaces.members}</h3>
      <div className="flex flex-col divide-y divide-border">
        {organisation.members?.map((member) => (
          <div
            key={member.user.userId}
            className="flex flex-row items-center gap-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <span className="font-medium">{member.user.name}</span>
              <span className="text-muted-foreground">
                {" "}
                ・ {member.user.userId} ・ {member.user.email}
              </span>
            </div>
            <span className="whitespace-nowrap">
              {member.role === "OWNER"
                ? dict.spaces.owner
                : member.role === "MANAGER"
                  ? dict.spaces.manager
                  : dict.spaces.approver}
            </span>
            {(member.role !== "OWNER" || isOwner) && (
              <details className="relative shrink-0">
                <summary
                  className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-md border border-border"
                  aria-label={dict.spaces.remove}
                >
                  ⋯
                </summary>
                <button
                  className="absolute right-0 top-full z-10 min-h-10 whitespace-nowrap border border-border bg-background px-3 text-sm text-destructive"
                  type="button"
                  onClick={async () => {
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
                >
                  {dict.spaces.remove}
                </button>
              </details>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-row flex-wrap gap-2">
        <Input
          className="min-w-48 flex-1"
          placeholder={dict.spaces.memberIdentifier}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
        <select
          className="min-h-10 rounded-md border border-border bg-background px-3"
          value={memberRole}
          onChange={(event) =>
            setMemberRole(event.target.value as "MANAGER" | "APPROVER")
          }
        >
          {isOwner && <option value="MANAGER">{dict.spaces.manager}</option>}
          <option value="APPROVER">{dict.spaces.approver}</option>
        </select>
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
    </div>
  );
};
