'use client';
import * as I from 'react-feather';
import Link from "next/link";
import { FC } from "react";
import { usePathname } from 'next/navigation';

const SideNav:FC = () => {
    const pathname = usePathname();
    const links = [
        {
            title: 'Today',
            href: '/today',
            icon: <I.Clock strokeWidth="1"/>
        },
        {
            title: 'Timetable',
            href: '/timetable',
            icon: <I.Calendar strokeWidth="1"/>
        },
        {
            title: 'Courses',
            href: '/courses',
            icon: <I.BookOpen strokeWidth="1"/>
        },
        {
            title: 'Locations',
            href: '/locations',
            icon: <I.Map strokeWidth="1"/>
        }
    ]
    console.log(pathname)
    return (
        <nav className="h-screen flex flex-col w-max gap-4 p-6">
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
    )
}

export default SideNav;