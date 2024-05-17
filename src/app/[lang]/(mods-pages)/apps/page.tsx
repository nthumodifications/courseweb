'use client';
import { apps } from "@/const/apps";
import { getDictionary } from "@/dictionaries/dictionaries";
import { LangProps } from "@/types/pages";
import Link from "next/link";
import { Info, ArrowRight } from 'lucide-react';
import FavouriteApp from "./Favorite";
import React from 'react';
import useDictionary from "@/dictionaries/useDictionary";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const AppList = ({
    params: { lang }
}: LangProps) => {
    const dict = useDictionary();
    const { ais } = useHeadlessAIS();


    return (
        <div className="h-full w-full">
            <div className="flex flex-col" suppressHydrationWarning>
                <h1 className="text-xl font-bold px-4 py-2">{dict.applist.title}</h1>
                {apps.filter(m => m.ais ? !!ais.enabled: true ).map(app => (<div key={app.id} className="flex flex-row items-center space-x-2 py-2 px-4 hover:bg-gray-100 dark:hover:bg-neutral-800">
                    <Link href={app.href} className="flex flex-row flex-1 items-center space-x-2" target={app.target}>
                        <div className="p-3 rounded-full bg-indigo-100 text-indigo-800 grid place-items-center">
                            <app.Icon size={16}/>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <h2 className="text-base font-medium text-gray-600 dark:text-neutral-400">{lang == 'zh' ? app.title_zh: app.title_en}</h2>
                        </div>
                    </Link>
                    <div className="items-center px-3">
                        <FavouriteApp appId={app.id}/>
                    </div>
                </div>))}
                {/* <CCXPDownAlert/> */}
                <div className="px-4 py-2 space-y-2">
                    {!ais.enabled && <Alert 
                        color="success" 
                    >
                        <Info className="mr-2"/>
                        <div className="flex flex-col">
                            <h4 className="font-bold mb-1">還有更多功能！</h4>
                            <p>到設定同步校務資訊系統后，可以直接在這裏使用校務資訊系統的功能！</p>
                        </div>
                        <React.Fragment>
                            <Link href={`/${lang}/settings#headless_ais`}>
                                <Button variant="default">前往開通<ArrowRight className="w-4 h-4"/></Button>
                            </Link>
                        </React.Fragment>
                    </Alert>}
                    <Alert>
                        <AlertTitle>沒有你要的功能？</AlertTitle>
                        <AlertDescription>快到<Link href="https://github.com/nthumodifications/courseweb/issues/new" className="underline text-indigo-600">Github</Link>提出你的想法吧</AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
}

export default AppList;