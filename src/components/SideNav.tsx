'use client';
import * as I from 'lucide-react';
import Link from "next/link";
import { FC } from "react";
import { useParams, usePathname } from 'next/navigation';
import { useMediaQuery } from 'usehooks-ts';
import { Route } from 'next';
import { useSettings } from '@/hooks/contexts/settings';
import useDictionary from '@/dictionaries/useDictionary';

const SideNav:FC = () => {
    const pathname = usePathname();
    const { language } = useSettings();
    const dict = useDictionary();
    const links: {
        title: string;
        href: Route;
        icon: JSX.Element;
        color: string;
    }[] = [
        {
            title: dict.navigation.today,
            href: `/${language}/today`,
            icon: <I.LayoutList strokeWidth="2"/>,
            color: '#7EC96D'
        },
        {
            title: dict.navigation.timetable,
            href: `/${language}/timetable`,
            icon: <I.Calendar strokeWidth="2"/>,
            color: '#E47B86'
        },
        {
            title: dict.navigation.courses,
            href: `/${language}/courses`,
            icon: <I.BookOpen strokeWidth="2"/>,
            color: '#7BC2CF'
        },
        {
            title: dict.navigation.bus,
            href: `/${language}/bus`,
            icon: <I.Bus strokeWidth="2"/>,
            color: '#EB8751'
        },
        {
            title: dict.applist.title,
            href: `/${language}/apps`,
            icon: <I.LayoutGrid strokeWidth="2"/>,
            color: '#AEA3C9'
        },
        {
            title: dict.navigation.settings,
            href: `/${language}/settings`,
            icon: <I.Settings strokeWidth="2"/>,
            color: '#B46DD6'
        }
    ]
    return (<>
        <nav className="hidden h-screen md:flex flex-col justify-start items-start gap-3 px-2 pt-8 pl-8">
            {links.map((link, index) => (
                <Link 
                    className={`w-full flex flex-row items-center justify-start gap-2 rounded-md transition dark:text-slate-300 font-semibold px-3 py-1.5 ${link.href == pathname ? 'text-white  bg-purple-700': 'text-slate-700'}`}
                    key={index} 
                    href={link.href}
                >
                    <span className="w-6 h-6">
                        {link.icon}
                    </span>
                    <span className="flex-1 font-semibold">
                        {link.title}
                    </span>
                </Link>
            ))}
        </nav>
    </>)
}

export default SideNav;