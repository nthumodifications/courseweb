'use client';
import Link from "next/link";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

const AprilFoolsBanner = () => {
    const APRILFOOLSURL = 'https://aprilfools.nthumods.com';
    const [hasOpenedAprilFools, setHasOpenedAprilFools] = useLocalStorage('hasOpenedAprilFools', false);

    useEffect(() => {
        if (!hasOpenedAprilFools && typeof window !== 'undefined') {
            setHasOpenedAprilFools(true);
            window.location.replace(APRILFOOLSURL);
        }
    }, [hasOpenedAprilFools, setHasOpenedAprilFools]);

    return (
        <div className="w-full h-10 col-span-2">
            <div className="bg-nthu-400 h-full flex flex-row items-center justify-center">
                <p className="text-black text-sm mr-4">🎉愚人節快樂~ April Fools! 🎉</p>
                <Link href={APRILFOOLSURL} className="text-black text-sm flex flex-row gap-2 underline">
                    前往愚人節版本 →
                </Link>
            </div>
        </div>
    );
}

export default AprilFoolsBanner;