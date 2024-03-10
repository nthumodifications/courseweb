import authConfig from '@/app/api/auth/[...nextauth]/authConfig';
import {getServerSession} from 'next-auth';
import {redirect} from 'next/navigation';

const CDSAdmin = async ({children, courselist, submissions, params: { term }}: {
  children: React.ReactNode
  courselist: React.ReactNode
  submissions: React.ReactNode,
  params: { lang: string, term: string }
}) => {
    const session = await getServerSession(authConfig);

    if (!session) redirect('/');
    
    const isAdmin = session?.user.roles.includes('cds_admin');

    if (!isAdmin) redirect('/');

    return (
        <div className="flex flex-col gap-4 h-full w-full">
            <h1 className="text-3xl font-bold py-4 px-3">{decodeURI(term)}調查 - 全部回覆</h1>
            <div className="w-full h-full grid grid-cols-[2fr_3fr] gap-4 divide-x divide-gray-200">
                <div className='w-full h-full overflow-y-auto'>{courselist}</div>
                <div className='w-full h-full overflow-y-auto pl-4'>{submissions}</div>
            </div>
            {children}
        </div>
    )
}

export default CDSAdmin;