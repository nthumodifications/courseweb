"use server";
const endpoint = (key: string, accountID: string, namespaceID: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountID}/storage/kv/namespaces/${namespaceID}/values/${key}`;

export const addShortLink = async (url: string) => {
  // generate a random 16-character key
  const key = Array.from(
    { length: 16 },
    () => Math.random().toString(36)[2],
  ).join("");

  const res = await fetch(
    endpoint(
      key,
      process.env.CLOUDFLARE_WORKER_ACCOUNT_ID!,
      process.env.CLOUDFLARE_KV_SHORTLINKS_NAMESPACE!,
    ),
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_KV_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: url,
    },
  ).then((response) => response.json());

  if (!res.success) {
    return {
      error: { message: "Failed to create short link" },
    };
  }

  return `https://nthumods.com/l/${key}`;
};

export const getShortLink = async (key: string) => {
  const text = await fetch(
    endpoint(
      key,
      process.env.CLOUDFLARE_WORKER_ACCOUNT_ID!,
      process.env.CLOUDFLARE_KV_SHORTLINKS_NAMESPACE!,
    ),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_KV_API_TOKEN}`,
        "Content-Type": "text/plain",
      },
    },
  ).then((response) => response.text());
  // if response is a json object, it means an error occurred
  try {
    const json = JSON.parse(text);
    return null;
  } catch (e) {}
  return text;
};
