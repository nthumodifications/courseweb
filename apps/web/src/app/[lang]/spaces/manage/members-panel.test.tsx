import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Organisation } from "../api";
import { MemberRoleSelect, OrganisationMemberRow } from "./members-panel";

type Member = NonNullable<Organisation["members"]>[number];

const makeMember = (userId: string, role: Member["role"]): Member => ({
  role,
  user: {
    userId,
    name: `Person ${userId}`,
    nameEn: `Person ${userId}`,
    email: `${userId}@example.com`,
  },
});

const labels = {
  owner: "Owner",
  manager: "Manager",
  approver: "Approver",
  remove: "Remove",
  removeConfirm: "Remove this member?",
  cancel: "Cancel",
  moreActions: "More actions",
};

const renderMemberRow = ({
  viewerId,
  viewerRole,
  member,
  ownerCount = 1,
}: {
  viewerId: string;
  viewerRole: NonNullable<Organisation["role"]>;
  member: Member;
  ownerCount?: number;
}) =>
  renderToStaticMarkup(
    createElement(OrganisationMemberRow, {
      member,
      viewerId,
      viewerRole,
      ownerCount,
      labels,
      onRemove: async () => {},
    }),
  );

describe("organisation member action visibility", () => {
  test("owners can remove any member, but not the last owner", () => {
    expect(
      renderMemberRow({
        viewerId: "owner-1",
        viewerRole: "OWNER",
        member: makeMember("approver-1", "APPROVER"),
      }),
    ).toContain('aria-label="More actions: Person approver-1"');

    expect(
      renderMemberRow({
        viewerId: "owner-1",
        viewerRole: "OWNER",
        member: makeMember("owner-1", "OWNER"),
      }),
    ).not.toContain('aria-label="More actions: Person owner-1"');

    expect(
      renderMemberRow({
        viewerId: "owner-1",
        viewerRole: "OWNER",
        member: makeMember("owner-2", "OWNER"),
        ownerCount: 2,
      }),
    ).toContain('aria-label="More actions: Person owner-2"');
  });

  test("managers can remove approvers and themselves only", () => {
    expect(
      renderMemberRow({
        viewerId: "manager-1",
        viewerRole: "MANAGER",
        member: makeMember("approver-1", "APPROVER"),
      }),
    ).toContain('aria-label="More actions: Person approver-1"');
    expect(
      renderMemberRow({
        viewerId: "manager-1",
        viewerRole: "MANAGER",
        member: makeMember("manager-1", "MANAGER"),
      }),
    ).toContain('aria-label="More actions: Person manager-1"');
    expect(
      renderMemberRow({
        viewerId: "manager-1",
        viewerRole: "MANAGER",
        member: makeMember("manager-2", "MANAGER"),
      }),
    ).not.toContain('aria-label="More actions: Person manager-2"');
    expect(
      renderMemberRow({
        viewerId: "manager-1",
        viewerRole: "MANAGER",
        member: makeMember("owner-1", "OWNER"),
        ownerCount: 2,
      }),
    ).not.toContain('aria-label="More actions: Person owner-1"');
  });

  test("other roles can leave, and only managers or owners see email", () => {
    const approverRow = renderMemberRow({
      viewerId: "approver-1",
      viewerRole: "APPROVER",
      member: makeMember("approver-1", "APPROVER"),
    });
    expect(approverRow).toContain(
      'aria-label="More actions: Person approver-1"',
    );
    expect(approverRow).not.toContain("approver-1@example.com");
    expect(
      renderMemberRow({
        viewerId: "approver-1",
        viewerRole: "APPROVER",
        member: makeMember("approver-2", "APPROVER"),
      }),
    ).not.toContain('aria-label="More actions: Person approver-2"');

    expect(
      renderMemberRow({
        viewerId: "manager-1",
        viewerRole: "MANAGER",
        member: makeMember("approver-1", "APPROVER"),
      }),
    ).toContain("approver-1@example.com");
    expect(
      renderMemberRow({
        viewerId: "owner-1",
        viewerRole: "OWNER",
        member: makeMember("approver-1", "APPROVER"),
      }),
    ).toContain("approver-1@example.com");
  });

  test("only owners see the manager option when adding a member", () => {
    const ownerSelect = renderToStaticMarkup(
      createElement(MemberRoleSelect, {
        viewerRole: "OWNER",
        value: "APPROVER",
        onChange: () => {},
        labels: { manager: "Manager", approver: "Approver" },
      }),
    );
    const managerSelect = renderToStaticMarkup(
      createElement(MemberRoleSelect, {
        viewerRole: "MANAGER",
        value: "APPROVER",
        onChange: () => {},
        labels: { manager: "Manager", approver: "Approver" },
      }),
    );
    expect(ownerSelect).toContain('value="MANAGER"');
    expect(managerSelect).not.toContain('value="MANAGER"');
  });
});
