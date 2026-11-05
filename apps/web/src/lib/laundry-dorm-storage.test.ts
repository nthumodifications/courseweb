import { expect, test } from "bun:test";
import { LAUNDRY_DORMS, type LaundryDorm } from "@/const/laundry-machines";
import {
  laundryDormStorageOptions,
  parseLaundryDormPreference,
} from "./laundry-dorm-storage";

const dorm = Object.keys(LAUNDRY_DORMS)[0] as LaundryDorm;

test("laundry dorm preferences share the raw value used by the laundry page", () => {
  expect(laundryDormStorageOptions.serializer(dorm)).toBe(dorm);
  expect(laundryDormStorageOptions.deserializer(dorm)).toBe(dorm);
  expect(parseLaundryDormPreference(JSON.stringify(dorm))).toBe(dorm);
  expect(laundryDormStorageOptions.serializer("all")).toBe("");
  expect(laundryDormStorageOptions.deserializer("")).toBe("all");
});
