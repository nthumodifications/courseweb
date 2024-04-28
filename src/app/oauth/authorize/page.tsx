import { Label } from "@/components/ui/label";
import { allowedClients } from "../allowedClients";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo";
import {loginAndAuthorize, AuthorizationData} from '@/app/oauth/authorize/page.action';


// NTHUMods OAuth2.0 Auth Init
const NTHUModsOauthLoginPage = async ({
    params,
    searchParams,
  }: {
    params: { slug: string };
    searchParams?: { [key: string]: string | string[] | undefined };
  }) => {
    if (!searchParams) throw new Error("Missing required parameters");
    const { response_type, client_id, redirect_uri, scope, state } = searchParams as AuthorizationData;

    if (response_type != "code") throw new Error("Invalid response_type");
    if (!client_id || !redirect_uri || !scope || !state) throw new Error("Missing required parameters");

    const client = allowedClients.find(c => c.id == client_id);
    if (!client) throw new Error("Invalid client_id");
    if (!client.redirect_uris.includes(redirect_uri as string)) throw new Error("Invalid redirect_uri");
    
    //check if scopes are valid 
    const scopes = (scope as string).split(" ");
    if (!scopes.every(s => client.scopes.includes(s))) throw new Error("Invalid scope");

    const action = loginAndAuthorize.bind(null, { response_type, client_id, redirect_uri, scope, state })

    return <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex justify-center mb-6">
          <NTHUModsLogo/>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-center dark:text-white">NTHUMods</h2>
        <form className="space-y-4" action={action}>
          <div>
            <Label className="block mb-1 dark:text-gray-300" htmlFor="username">
              Student ID
            </Label>
            <Input id="username" name="username" placeholder="Enter your username" required type="text" />
          </div>
          <div>
            <Label className="block mb-1 dark:text-gray-300" htmlFor="password">
              Password
            </Label>
            <Input id="password" name="password" placeholder="Enter your password" required type="password" />
          </div>
          <div className="flex justify-end">
            <Link
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              href="#"
            >
              Forgot Password?
            </Link>
          </div>
          <Button className="w-full" type="submit">
            Login
          </Button>
        </form>
      </div>
    </div>
}

export default NTHUModsOauthLoginPage;