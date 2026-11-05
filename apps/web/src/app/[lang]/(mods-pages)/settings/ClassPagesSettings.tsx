"use client";

import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Switch } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  classPageKeys,
  getClassPageProfile,
  leaveClassPages,
  saveClassPageProfile,
  unblockClassPageMember,
  type ClassPageContact,
} from "@/lib/class-pages";

type ProfileDraft = {
  displayName: string;
  department: string;
  year: string;
  contacts: ClassPageContact[];
  displayNameVisible: boolean;
  departmentVisible: boolean;
  yearVisible: boolean;
  contactsVisible: boolean;
};

const emptyDraft: ProfileDraft = {
  displayName: "",
  department: "",
  year: "",
  contacts: [],
  displayNameVisible: true,
  departmentVisible: true,
  yearVisible: true,
  contactsVisible: false,
};

export const ClassPagesSettings = () => {
  const auth = useAuth();
  const dict = useDictionary();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const token = auth.user?.access_token;
  const profileQuery = useQuery({
    queryKey: classPageKeys.profile,
    queryFn: () => getClassPageProfile(token!),
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    const profile = profileQuery.data?.profile;
    if (!profile) {
      setDraft(emptyDraft);
      return;
    }
    setDraft({
      displayName: profile.displayName,
      department: profile.department,
      year: profile.year,
      contacts: profile.contacts,
      displayNameVisible: profile.displayNameVisible,
      departmentVisible: profile.departmentVisible,
      yearVisible: profile.yearVisible,
      contactsVisible: profile.contactsVisible,
    });
  }, [profileQuery.data]);

  const refreshProfile = () =>
    queryClient.invalidateQueries({ queryKey: classPageKeys.profile });
  const saveMutation = useMutation({
    mutationFn: () => saveClassPageProfile(token!, draft),
    onSuccess: refreshProfile,
  });
  const leaveMutation = useMutation({
    mutationFn: () => leaveClassPages(token!),
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["class-pages"] });
    },
  });
  const unblockMutation = useMutation({
    mutationFn: (blockId: string) => unblockClassPageMember(token!, blockId),
    onSuccess: refreshProfile,
  });

  if (!auth.isAuthenticated || !token)
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {dict.settings.class_pages.signed_out}
      </p>
    );
  if (profileQuery.isLoading)
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {dict.settings.class_pages.loading}
      </p>
    );
  if (profileQuery.error)
    return (
      <p className="py-4 text-sm text-destructive">
        {dict.settings.class_pages.error}
      </p>
    );

  const profile = profileQuery.data?.profile;
  const setVisibility = (
    field: keyof Pick<
      ProfileDraft,
      | "displayNameVisible"
      | "departmentVisible"
      | "yearVisible"
      | "contactsVisible"
    >,
    value: boolean,
  ) => setDraft((current) => ({ ...current, [field]: value }));

  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {dict.settings.class_pages.privacy_note}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            {dict.settings.class_pages.display_name}
          </span>
          <Input
            value={draft.displayName}
            maxLength={50}
            onChange={(event) =>
              setDraft({ ...draft, displayName: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            {dict.settings.class_pages.department}
          </span>
          <Input
            value={draft.department}
            maxLength={60}
            onChange={(event) =>
              setDraft({ ...draft, department: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            {dict.settings.class_pages.year}
          </span>
          <Input
            value={draft.year}
            maxLength={20}
            onChange={(event) =>
              setDraft({ ...draft, year: event.target.value })
            }
          />
        </label>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {(
          [
            ["displayNameVisible", dict.settings.class_pages.show_display_name],
            ["departmentVisible", dict.settings.class_pages.show_department],
            ["yearVisible", dict.settings.class_pages.show_year],
            ["contactsVisible", dict.settings.class_pages.show_contacts],
          ] as const
        ).map(([field, label]) => (
          <label
            key={field}
            className="flex min-h-10 items-center justify-between gap-4 py-2"
          >
            <span>{label}</span>
            <Switch
              checked={draft[field]}
              onCheckedChange={(value) => setVisibility(field, value)}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-bold">{dict.settings.class_pages.contacts}</h3>
          <Button
            type="button"
            variant="outline"
            disabled={draft.contacts.length >= 4}
            onClick={() =>
              setDraft({
                ...draft,
                contacts: [...draft.contacts, { label: "", value: "" }],
              })
            }
          >
            {dict.settings.class_pages.add_contact}
          </Button>
        </div>
        {draft.contacts.map((contact, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <Input
              aria-label={dict.settings.class_pages.contact_label}
              maxLength={30}
              value={contact.label}
              placeholder={dict.settings.class_pages.contact_label}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  contacts: draft.contacts.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                })
              }
            />
            <Input
              aria-label={dict.settings.class_pages.contact_value}
              maxLength={200}
              value={contact.value}
              placeholder={dict.settings.class_pages.contact_value}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  contacts: draft.contacts.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, value: event.target.value }
                      : item,
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setDraft({
                  ...draft,
                  contacts: draft.contacts.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                })
              }
            >
              {dict.a11y.delete}
            </Button>
          </div>
        ))}
      </div>

      {saveMutation.error && (
        <p className="text-sm text-destructive">
          {dict.settings.class_pages.error}
        </p>
      )}
      {leaveMutation.error && (
        <p className="text-sm text-destructive">
          {dict.settings.class_pages.error}
        </p>
      )}
      {unblockMutation.error && (
        <p className="text-sm text-destructive">
          {dict.settings.class_pages.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending
            ? dict.settings.class_pages.saving
            : dict.settings.class_pages.save}
        </Button>
        {profile && (
          <Button
            variant="outline"
            disabled={leaveMutation.isPending}
            onClick={() => leaveMutation.mutate()}
          >
            {dict.settings.class_pages.leave}
          </Button>
        )}
      </div>

      {profile && profile.blocks.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          <h3 className="py-2 font-bold">
            {dict.settings.class_pages.blocked_title}
          </h3>
          {profile.blocks.map((block) => (
            <div
              key={block.id}
              className="flex items-center justify-between gap-4 py-2"
            >
              <span>{dict.settings.class_pages.blocked_member}</span>
              <Button
                variant="ghost"
                onClick={() => unblockMutation.mutate(block.id)}
              >
                {dict.settings.class_pages.unblock}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassPagesSettings;
