import { faClock, faCalendar, faCalendarPlus, faMap } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { FC } from "react";

const SideNav:FC = () => {
    const links = [
        {
            title: 'Today',
            href: '/today',
            icon: <FontAwesomeIcon className="w-6 h-6" icon={faClock} />
        },
        {
            title: 'Timetable',
            href: '/timetable',
            icon: <FontAwesomeIcon className="w-6 h-6" icon={faCalendar}/>
        },
        {
            title: 'Courses',
            href: '/courses',
            icon: <FontAwesomeIcon className="w-6 h-6" icon={faCalendarPlus}/>
        },
        {
            title: 'Locations',
            href: '/locations',
            icon: <FontAwesomeIcon className="w-6 h-6" icon={faMap}/>
        }
    ]
    return (
        <nav className="h-screen px-8 py-4 bg-white">
            {links.map((link, index) => (
                <Link 
                    key={index} 
                    href={link.href} 
                    className="flex items-center space-x-3 py-2 text-base text-gray-400 hover:text-violet-700">
                        <span>{link.icon}</span>
                        <span className="text-semibold">{link.title}</span>
                </Link>
            ))}
        </nav>
    )
}

export default SideNav;