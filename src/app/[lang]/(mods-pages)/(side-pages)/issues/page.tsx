import { Codepen, Database, Globe } from 'lucide-react';
import Link from 'next/link';
import EmptyIssueForm from './EmptyIssueForm';
import { Separator } from '@/components/ui/separator';

const IssueButton = ({title, description, icon, href}: {title: string, description: string, icon: any, href: string}) => {
    return (
        <Link href={href}>
            <div className='flex flex-col flex-1 p-5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'>
                <div className='flex-1 py-8 items-center'>
                    {icon}
                </div>
                <h3 className='text-2xl'>{title}</h3>
                <p className='dark:text-gray-600 text-gray-400'>{description}</p>
            </div>
        </Link>
    )
}

const IssuesPage = () => {
    return (
        <div className="flex flex-col max-w-2xl px-4">
            <h1 className="font-semibold text-3xl text-gray-400 py-3">{"Report an Issue"}</h1>
            <div className='flex flex-row w-max m-4 rounded-md shadow-md divide-x divide-gray-200'>
                <IssueButton title="Data Issue" description="Report an issue with the data" icon={<Database className='w-8 h-8'/>} href="#dataissue"/>
                <IssueButton title="Bug/Feature" description="Report a bug or request a feature" icon={<Codepen className='w-8 h-8'/>} href="https://github.com/nthumodifications/courseweb/issues/new/choose"/>
                <IssueButton title="Other" description="Report an issue that doesn't fit in the above categories" icon={<Globe className='w-8 h-8'/>} href="mailto:nthumods@googlegroups.com"/>
            </div>
            <Separator/>
            <div id="dataissue" className="flex flex-col gap-4 py-4">
                {/* Explainer of the data sources */}
                <h2 className="font-semibold text-xl text-gray-600 dark:text-gray-400 pb-2">{"Data Sources"}</h2>
                <p className="text-gray-600 dark:text-gray-400">{"We use the following data sources to generate the course information."}</p>
                <ul className="list-disc list-inside">
                    <li className="text-gray-600 dark:text-gray-400">{"Course information is from the NTHU Courses JSON file."}</li>
                    <li className="text-gray-600 dark:text-gray-400">{"Course reviews are from PTT NTHU course reviews."}</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-400">{"If you find any issues with the data, please report it below."}</p>
                {/* Data issue form */}
            </div>
            <EmptyIssueForm />
        </div>
    )
}

export default IssuesPage