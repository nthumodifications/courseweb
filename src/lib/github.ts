"use server";
import jwt from "jsonwebtoken";

//decode env base64 private key
const privateKey = Buffer.from(
  process.env.GITHUB_APP_PRIVATE_KEY!,
  "base64",
).toString("utf-8");

const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID;
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;

type GithubIssue = {
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  id: number;
  node_id: string;
  number: number;
  title: string;
  user: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  labels: string[];
  state: string;
  locked: boolean;
  assignee: null;
  assignees: [];
  milestone: null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: null;
  author_association: string;
  active_lock_reason: null;
  draft: boolean;
  pull_request: {
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    merged_at: null;
  };
  body: null;
  reactions: {
    url: string;
    total_count: number;
    "+1": number;
    "-1": number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
  timeline_url: string;
  performed_via_github_app: null;
  state_reason: null;
};

const getJwt = () => {
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    iss: CLIENT_ID,
  };

  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  return token;
};

const getInstallationAccessToken = async () => {
  const jwtToken = getJwt();

  const response = await fetch(
    `https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );
  const data = await response.json();

  return data.token;
};

export const createIssue = async (
  title: string,
  body: string,
  labels: string[] = [],
) => {
  const accessToken = await getInstallationAccessToken();
  const repoOwner = "nthumodifications";
  const repoName = "courseweb";

  const response = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({ title, body, labels }),
    },
  );
  const data = await response.json();

  return data;
};

export const listIssuesWithTag = async (tag: string) => {
  const accessToken = await getInstallationAccessToken();
  const repoOwner = "nthumodifications";
  const repoName = "courseweb";

  const response = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/issues?filter=all&labels=${tag}&state=open`,
    {
      method: "GET",
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );
  const data = await response.json();

  return data as GithubIssue[];
};
