'use client';

import useDictionary from "@/dictionaries/useDictionary";
import { Button } from "@mui/joy";
import { signOut } from "next-auth/react";

const LogoutButton = () => {
    const dict = useDictionary();
    return <Button variant="soft" color="danger" onClick={() => signOut()}>登出</Button>
}

export default LogoutButton