import { expect, mock, test } from "bun:test";
import { readVapidConfig } from "./push";

const publicKey =
  "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
const privateKey = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";

test("accepts only a VAPID key pair that signs and verifies", async () => {
  await expect(
    readVapidConfig({
      VAPID_PUBLIC_KEY: publicKey,
      VAPID_PRIVATE_KEY: privateKey,
      VAPID_SUBJECT: "mailto:test@nthumods.com",
    }),
  ).resolves.toEqual({
    publicKey,
    privateKey,
    subject: "mailto:test@nthumods.com",
  });
  await expect(
    readVapidConfig({
      VAPID_PUBLIC_KEY: publicKey,
      VAPID_PRIVATE_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      VAPID_SUBJECT: "mailto:test@nthumods.com",
    }),
  ).resolves.toBeUndefined();
});

test("rejects an invalid VAPID subject without logging key material", async () => {
  const error = mock();
  const original = console.error;
  console.error = error;
  try {
    await expect(
      readVapidConfig({
        VAPID_PUBLIC_KEY: publicKey,
        VAPID_PRIVATE_KEY: privateKey,
        VAPID_SUBJECT: "https://",
      }),
    ).resolves.toBeUndefined();
  } finally {
    console.error = original;
  }
  expect(error).toHaveBeenCalledTimes(1);
  expect(String(error.mock.calls[0]?.[0])).not.toContain(privateKey);
  expect(String(error.mock.calls[0]?.[0])).not.toContain(publicKey);
});
