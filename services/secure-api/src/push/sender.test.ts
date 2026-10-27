import { expect, mock, test } from "bun:test";
import { sendPush, type PushDatabase } from "./sender";

const subscription = {
  id: "push-id",
  endpoint: "https://fcm.googleapis.com/subscription/abc",
  p256dh:
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  failureCount: 0,
};
const vapid = {
  publicKey:
    "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  privateKey: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  subject: "mailto:test@nthumods.com",
};
const payload = {
  title: "Test",
  body: "Body",
  url: "/en/settings#notifications",
  tag: "test",
};

const database = (failureCount = 0) => {
  const update = mock(({ data }: { data: { failureCount?: unknown } }) =>
    Promise.resolve({
      failureCount:
        typeof data.failureCount === "object"
          ? failureCount + 1
          : data.failureCount,
    }));
  const deleteMany = mock(() => Promise.resolve({ count: 1 }));
  return {
    db: { pushSubscription: { update, deleteMany } } as PushDatabase,
    update,
    deleteMany,
    subscription: { ...subscription, failureCount },
  };
};

test("sends encrypted payload with VAPID and delivery headers", async () => {
  const state = database();
  let request: Request | undefined;
  const result = await sendPush(
    subscription,
    payload,
    { ttl: 60 },
    {
      db: state.db,
      vapid,
      fetcher: async (input, init) => {
        request = new Request(input, init);
        return new Response(null, { status: 201 });
      },
    },
  );
  expect(result).toEqual({ status: 201, ok: true });
  expect(request?.headers.get("Content-Encoding")).toBe("aes128gcm");
  expect(request?.headers.get("TTL")).toBe("60");
  expect(request?.headers.get("Urgency")).toBe("normal");
  expect(request?.headers.get("Authorization")).toStartWith("vapid t=");
  expect(state.update).toHaveBeenCalledWith({
    where: { id: "push-id" },
    data: { failureCount: 0 },
  });
});

test("rejects a stored endpoint outside the push-service allowlist", async () => {
  const state = database();
  let fetched = false;
  const result = await sendPush(
    { ...subscription, endpoint: "https://127.0.0.1/internal" },
    payload,
    { ttl: 60 },
    {
      db: state.db,
      vapid,
      fetcher: async () => {
        fetched = true;
        return new Response(null, { status: 201 });
      },
    },
  );
  expect(result).toEqual({ status: 400, ok: false });
  expect(fetched).toBe(false);
});

test("uses a redirect-blocking ten-second timeout for delivery", async () => {
  const state = database();
  let init: RequestInit | undefined;
  await sendPush(
    subscription,
    payload,
    { ttl: 60 },
    {
      db: state.db,
      vapid,
      fetcher: async (input, requestInit) => {
        void input;
        init = requestInit;
        return new Response(null, { status: 201 });
      },
    },
  );
  expect(init?.redirect).toBe("error");
  expect(init?.signal).toBeInstanceOf(AbortSignal);
});

test("deletes subscriptions rejected as gone by the push service", async () => {
  const state = database();
  const result = await sendPush(
    subscription,
    payload,
    { ttl: 60 },
    {
      db: state.db,
      vapid,
      fetcher: async () => new Response(null, { status: 410 }),
    },
  );
  expect(result.status).toBe(410);
  expect(state.deleteMany).toHaveBeenCalledWith({ where: { id: "push-id" } });
  expect(state.update).not.toHaveBeenCalled();
});

test("increments failures and removes a subscription on its fifth failure", async () => {
  const state = database(4);
  const result = await sendPush(
    state.subscription,
    payload,
    { ttl: 60 },
    {
      db: state.db,
      vapid,
      fetcher: async () => new Response(null, { status: 503 }),
    },
  );
  expect(result.status).toBe(503);
  expect(state.update).toHaveBeenCalledWith({
    where: { id: "push-id" },
    data: { failureCount: { increment: 1 } },
    select: { failureCount: true },
  });
  expect(state.deleteMany).toHaveBeenCalledWith({ where: { id: "push-id" } });
});
