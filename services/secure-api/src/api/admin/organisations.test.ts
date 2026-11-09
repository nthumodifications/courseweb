import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import { createAdminOrganisationsApp } from "./organisations";

const organisationFindMany = mock();
const organisationUpdateMany = mock();
const recordAdminAction = mock();
const adminDb = {
  organisation: {
    findMany: organisationFindMany,
    updateMany: organisationUpdateMany,
  },
};
const organisationsRouter = createAdminOrganisationsApp({
  db: adminDb as never,
  audit: recordAdminAction,
});

const auth = async (c: any, next: () => Promise<void>) => {
  c.set("user", { userId: "admin-1" });
  await next();
};
const app = new Hono()
  .use("*", auth)
  .route("/organisations", organisationsRouter);

describe("admin space organisation verification", () => {
  beforeEach(() => {
    organisationFindMany.mockReset();
    organisationUpdateMany.mockReset();
    recordAdminAction.mockReset();
  });

  test("returns the pending organisation queue by default", async () => {
    organisationFindMany.mockResolvedValue([
      { id: "org-1", status: "PENDING" },
    ]);
    const response = await app.request("/organisations");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      organisations: [{ id: "org-1", status: "PENDING" }],
    });
    expect(organisationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PENDING" } }),
    );
  });

  test("changes organisation status and writes an admin audit record", async () => {
    organisationUpdateMany.mockResolvedValue({ count: 1 });
    const response = await app.request("/organisations/org-1/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "VERIFIED",
        reason: "Confirmed by club office",
      }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "VERIFIED" });
    expect(recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        action: "space_organisation.status",
        targetId: "org-1",
      }),
    );
  });

  test("requires an audit reason and returns 404 for an unknown organisation", async () => {
    const invalidResponse = await app.request("/organisations/org-1/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED", reason: " " }),
    });
    expect(invalidResponse.status).toBe(400);
    organisationUpdateMany.mockResolvedValue({ count: 0 });
    const missingResponse = await app.request("/organisations/missing/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SUSPENDED", reason: "Duplicate" }),
    });
    expect(missingResponse.status).toBe(404);
  });
});
