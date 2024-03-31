'use client';;
import * as I from 'lucide-react';
import Link from "next/link";
import { FC, useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';
import { Route } from 'next';
import { useSettings } from '@/hooks/contexts/settings';
import useDictionary from '@/dictionaries/useDictionary';
import { link } from 'fs';

const SideNav:FC = () => {
    const pathname = usePathname();
    const { language } = useSettings();
    const dict = useDictionary();
    const router = useRouter();
    const links: {
        title: string;
        href: Route;
        icon: string;
        color: string;
    }[] = [
        {
            title: dict.navigation.today,
            href: `/${language}/today`,
            icon: 'https://www.ccxp.nthu.edu.tw/class.tree/ftv2/ftv2folderclosed.gif',
            color: '#7EC96D'
        },
        {
            title: dict.navigation.timetable,
            href: `/${language}/timetable`,
            icon: 'https://www.ccxp.nthu.edu.tw/class.tree/ftv2/ftv2folderclosed.gif',
            color: '#E47B86'
        },
        {
            title: dict.navigation.courses,
            href: `/${language}/courses`,
            icon: 'https://www.ccxp.nthu.edu.tw/class.tree/ftv2/ftv2folderclosed.gif',
            color: '#7BC2CF'
        },
        {
            title: dict.navigation.bus,
            href: `/${language}/bus`,
            icon: 'https://www.ccxp.nthu.edu.tw/class.tree/ftv2/ftv2folderclosed.gif',
            color: '#EB8751'
        },
        {
            title: dict.applist.title,
            href: `/${language}/apps`,
            icon: 'https://www.ccxp.nthu.edu.tw/class.tree/ftv2/ftv2folderclosed.gif',
            color: '#AEA3C9'
        },
        {
            title: dict.navigation.settings,
            href: `/${language}/settings`,
            icon: 'https://www.ccxp.nthu.edu.tw/class.tree/ftv2/ftv2folderclosed.gif',
            color: '#B46DD6'
        }
    ]

    useEffect(() => {
        links.forEach(link => {
            router.prefetch(link.href);
        })
    }, [links])

    return (
        <nav className="h-full w-full flex flex-col justify-start items-start">
            {links.map((link, index) => (
                <div 
                    className={`w-full text-3xl flex flex-row rounded-md cursor-pointer transition dark:text-slate-300 py-4`}
                    key={index} 
                    onClick={() => router.push(link.href)} 
                >
                    {link.href == pathname ? 
                        <img src="https://www.ccxp.nthu.edu.tw/class.tree/ftv2/ftv2folderopen.gif" />
                        :
                        <img src={link.icon} className="w-6 h-6" />
                    }
                
                    <span className="flex-1 font-bold">
                        {link.title}
                    </span>
                </div>
            ))}
        </nav>
    )
}

export default SideNav;