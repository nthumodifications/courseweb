import authConfig from "@/app/api/auth/[...nextauth]/authConfig";
import { getServerSession } from "next-auth";
import { signIn } from "next-auth/react";
import { PropsWithChildren } from "react";
import AdminHeader from "./AdminHeader";
import NTHULoginButton from "../NTHULoginButton";

export const runtime = "nodejs";

const Layout = async ({ children }: PropsWithChildren) => {
    const session = await getServerSession(authConfig);

    if (!session) return <div className="grid place-items-center">
        <NTHULoginButton/>
    </div>
    else return <div className="flex flex-col flex-1 min-h-screen">
        <AdminHeader/>
        {children}
    </div>;
}

export default Layout;