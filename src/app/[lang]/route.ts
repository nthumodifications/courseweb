import { redirect } from "next/navigation";

export async function GET(request: Request) {
  redirect("/today");
  return new Response(null, { status: 302 });
}
