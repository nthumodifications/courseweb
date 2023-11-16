import authConfig from "@/app/api/auth/[...nextauth]/authConfig";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";

const Layout = async ({ children }: PropsWithChildren) => {
    const session = await getServerSession(authConfig);

    if (!session) redirect('/');
    
    // allowed-admins
    const allowedAdmins = ['111060062']
    const isAdmin = allowedAdmins?.includes(session.user.id);

    if (!isAdmin) redirect('/');
    else return <>{children}</>;
}

export default Layout;