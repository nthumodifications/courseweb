
export const runtime = "nodejs";

const CDSAdmin = async ({children, courselist, submissions}: {
  children: React.ReactNode
  courselist: React.ReactNode
  submissions: React.ReactNode
}) => {
    return (
        <div className="flex flex-col gap-4 h-full w-full">
            <h1 className="text-3xl font-bold py-4 px-3">選課規劃調查 Admin</h1>
            <div className="w-full h-full grid grid-cols-[2fr_3fr] gap-4">
                <div className='w-full h-full overflow-y-auto'>{courselist}</div>
                <div className='w-full h-full overflow-y-auto'>{submissions}</div>
            </div>
            {children}
        </div>
    )
}

export default CDSAdmin;