import { faClock, faCalendar, faCalendarPlus, faMap } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { FC } from "react";

const SideNav:FC = () => {
    const links = [
        {
            title: 'Today',
            href: '/today',
            icon: <FontAwesomeIcon icon={faClock} />
        },
        {
            title: 'Timetable',
            href: '/timetable',
            icon: <FontAwesomeIcon icon={faCalendar}/>
        },
        {
            title: 'Courses',
            href: '/courses',
            icon: <FontAwesomeIcon icon={faCalendarPlus}/>
        },
        {
            title: 'Locations',
            href: '/locations',
            icon: <FontAwesomeIcon icon={faMap}/>
        }
    ]
    return (
        <nav className="h-screen px-8 py-4 bg-white">
            {links.map((link, index) => (
                <Link 
                    key={index} 
                    href={link.href} 
                    className="flex items-center space-x-2 px-4 py-2 text-base text-gray-700 hover:text-violet-700">
                        <span className="w-6 h-6">{link.icon}</span>
                        
                        <span className="text-semibold">{link.title}</span>
                </Link>
            ))}
        </nav>
    )
}

export default SideNav;