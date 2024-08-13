import authConfig from "@/app/api/auth/[...nextauth]/authConfig";
import { Separator } from "@/components/ui/separator";
import supabase_server from "@/config/supabase_server";
import { getCDSTerm } from "@/lib/cds_actions";
import { formatDistanceToNow } from "date-fns";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DownloadSubmissions from "./DownloadSubmissions";

const getTermSubmissionDetails = async (term: string) => {
  const termObj = await getCDSTerm(term);
  const {
    data: submission_list = [],
    count: submissions,
    error: error1,
  } = await supabase_server
    .from("cds_submissions")
    .select("*", { count: "exact" })
    .eq("term", termObj.term);
  if (error1) throw error1;
  const { count: saves, error: error2 } = await supabase_server
    .from("cds_saves")
    .select("*", { count: "exact", head: true })
    .eq("term", termObj.term);
  if (error2) throw error2;
  return {
    submission_list: submission_list ?? [],
    submissions,
    saves,
    ...termObj,
  };
};

const CDSAdmin = async ({
  children,
  courselist,
  submissions,
  params: { term },
}: {
  children: React.ReactNode;
  courselist: React.ReactNode;
  submissions: React.ReactNode;
  params: { lang: string; term: string };
}) => {
  const session = await getServerSession(authConfig);

  if (!session) redirect("/");

  const isAdmin = session?.user.roles.includes("cds_admin");

  if (!isAdmin) redirect("/");

  const submissionsDetails = await getTermSubmissionDetails(decodeURI(term));

  return (
    <div className="flex flex-col h-full w-full px-4">
      <h1 className="text-3xl font-bold py-2">
        {decodeURI(term)}調查 - 全部回覆
      </h1>
      <div className="flex flex-row items-center rounded-md bg-gray-100 dark:bg-neutral-800 max-w-md my-2">
        <div className="flex-1 px-1 py-3 flex flex-col items-center">
          <h2 className="text-xl font-bold pb-0.5">Submissions</h2>
          <p>{submissionsDetails.submissions}</p>
        </div>
        <Separator orientation="vertical" />
        <div className="flex-1 px-1 py-3 flex flex-col items-center">
          <h2 className="text-xl font-bold pb-0.5">Saves</h2>
          <p>{submissionsDetails.saves}</p>
        </div>
        <Separator orientation="vertical" />
        <div className="flex-1 px-1 py-3 flex flex-col items-center">
          <h2 className="text-xl font-bold pb-0.5">Ends In</h2>
          <p>{formatDistanceToNow(new Date(submissionsDetails.ends))}</p>
        </div>
        <Separator orientation="vertical" />
        <div className="flex-1 px-1 py-3 flex flex-col items-center">
          <DownloadSubmissions
            submissions={submissionsDetails.submission_list}
            filename={decodeURI(term)}
          />
        </div>
      </div>
      <Separator />
      <div className="w-full flex-1 grid grid-cols-[2fr_3fr] gap-4 divide-x divide-gray-200 overflow-y-hidden">
        <div className="w-full h-full overflow-y-auto py-2">{courselist}</div>
        <div className="w-full h-full overflow-y-auto pl-4 py-2">
          {submissions}
        </div>
      </div>
      {children}
    </div>
  );
};

export default CDSAdmin;
