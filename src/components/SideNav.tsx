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
    }[] = [
        {
            title: dict.navigation.today,
            href: `/${language}/today`,
            icon: <I.Clock strokeWidth="1"/>
        },
        {
            title: dict.navigation.timetable,
            href: `/${language}/timetable`,
            icon: <I.Calendar strokeWidth="1"/>
        },
        {
            title: dict.navigation.courses,
            href: `/${language}/courses`,
            icon: <I.BookOpen strokeWidth="1"/>
        },
        {
            title: dict.navigation.venues,
            href: `/${language}/venues`,
            icon: <I.Map strokeWidth="1"/>
        },
        {
            title: dict.navigation.bus,
            href: `/${language}/bus`,
            icon: <I.Navigation strokeWidth="1"/>
        },
        {
            title: dict.navigation.settings,
            href: `/${language}/settings`,
            icon: <I.Settings strokeWidth="1"/>
        }
    ]
    return (<>
        <nav className="md:hidden w-screen flex flex-row h-10 gap-4 justify-evenly">
            {links.map((link, index) => (
                <Link className={`flex items-center gap-4 hover:text-fuchsia-600 hover:underline transition-colors ${link.href == pathname ? "text-fuchsia-600":"text-gray-600"}`}
                    key={index} href={link.href}>
                    <span className="w-6">
                        {link.icon}
                    </span>
                </Link>
            ))}
        </nav>
        <nav className="hidden h-screen md:flex flex-col w-max gap-4 p-6">
            {links.map((link, index) => (
                <Link className={`flex items-center gap-4 hover:text-fuchsia-600 hover:underline transition-colors ${link.href == pathname ? "text-fuchsia-600":"text-gray-600"}`}
                    key={index} href={link.href}>

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