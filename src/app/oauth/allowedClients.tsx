export const allowedClients = [
  {
    id: "courseweb",
    name: "NTHUMods",
    client_secret: "secretyoursecret",
    redirect_uris: ["http://localhost:3000/api/auth/callback/nthumods"],
    scopes: ["id", "login", "email", "courses"]
  },
];
