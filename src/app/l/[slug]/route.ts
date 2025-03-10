import client from "@/config/api";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (
  req: NextRequest,
  props: { params: { slug: string } },
) => {
  const slug = props.params.slug;
  if (!slug) {
    return NextResponse.json(
      { error: { message: "Invalid Slug" } },
      { status: 404 },
    );
  }
  const url = await (
    await client.shortlink[":key"].$get({ param: { key: slug } })
  ).text();
  if (url === null) {
    return NextResponse.json(
      { error: { message: "Link does not exist" } },
      { status: 404 },
    );
  }
  return NextResponse.redirect(url);
};
