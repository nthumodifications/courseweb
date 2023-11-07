'use client';
import * as I from 'react-feather';
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
            icon: <I.Clock strokeWidth="2"/>,
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
            title: dict.navigation.venues,
            href: `/${language}/venues`,
            icon: <I.Map strokeWidth="2"/>,
            color: '#AEA3C9'
        },
        {
            title: dict.navigation.bus,
            href: `/${language}/bus`,
            icon: <I.Navigation strokeWidth="2"/>,
            color: '#EB8751'
        },
        {
            title: dict.navigation.settings,
            href: `/${language}/settings`,
            icon: <I.Settings strokeWidth="2"/>,
            color: '#B46DD6'
        }
    ]
    return (<>
        <nav className="md:hidden w-screen flex flex-row h-10 gap-4 justify-evenly py-3">
            {links.map((link, index) => (
                <Link 
                    className={`flex items-center gap-4 hover:opacity-80 hover:underline transition text-gray-400 dark:text-gray-600`}
                    key={index} 
                    href={link.href}
                    style={{ color: link.href == pathname ? link.color: '' }}
                >
                    <span className="w-6">
                        {link.icon}
                    </span>
                </Link>
            ))}
        </nav>
        <nav className="hidden h-screen md:flex flex-col w-max gap-4 p-6">
            {links.map((link, index) => (
                <Link 
                    className={`flex items-center gap-3 hover:opacity-80 hover:underline transition text-gray-400 dark:text-gray-600`}
                    key={index} 
                    href={link.href}
                    style={{ color: link.href == pathname ? link.color: '' }}
                >
                    <div className={`w-[6px] h-7 ${link.href != pathname ? 'max-h-1': 'max-h-6'} transition`} style={{backgroundColor: link.color}}></div>
                    <span className="w-6">
                        {link.icon}
                    </span>
                    <span className="text-semibold">
                        {link.title}
                    </span>
                </Link>
            ))}
        </nav>
    </>)
}

export default SideNav;