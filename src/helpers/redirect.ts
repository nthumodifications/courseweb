"use server";
import { redirect } from "next/navigation";

export default async function redirectHard(uri: string) {
  redirect(uri);
}