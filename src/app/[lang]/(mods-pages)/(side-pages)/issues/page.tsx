import { Codepen, Database, Globe } from "lucide-react";
import Link from "next/link";
import EmptyIssueForm from "./EmptyIssueForm";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/Footer";

const IssueButton = ({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: any;
  href: string;
}) => {
  return (
    <Link href={href}>
      <div className="flex flex-col flex-1 p-5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
        <div className="flex-1 py-8 items-center">{icon}</div>
        <h3 className="text-2xl">{title}</h3>
        <p className="dark:text-gray-600 text-gray-400">{description}</p>
      </div>
    </Link>
  );
};

const IssuesPage = () => {
  return (
    <div className="flex flex-col max-w-2xl px-4 prose prose-neutral dark:prose-invert">
      <h1>Report an Issue</h1>
      <div id="dataissue" className="flex flex-col">
        {/* Explainer of the data sources */}
        <h2>{"Data Sources"}</h2>
        <p>
          We collect a variety of data sources to compile the best course
          information for you. These include:
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col">
            <div className="text-lg font-bold">最新課程資料《 JSON格式》</div>
            <a
              className="text-muted-foreground text-sm"
              href="https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json"
              target="_blank"
            >
              https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json
            </a>
          </div>
          <div className="flex flex-col">
            <div className="text-lg font-bold">校務資訊系統課程總表</div>
            <a
              className="text-muted-foreground text-sm"
              href="https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629001.php"
              target="_blank"
            >
              https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629001.php
            </a>
          </div>
          <div className="flex flex-col">
            <div className="text-lg font-bold">課程平均值及標準差查詢</div>
            <a
              className="text-muted-foreground text-sm"
              href="https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/8.4/8.4.2/JH84201.php"
              target="_blank"
            >
              https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/8.4/8.4.2/JH84201.php
            </a>
          </div>
        </div>
        <p>
          {`We fetch and update the data daily at 8 AM. If there are issues with the course details on NTHUMods, please verify from the above links if the its an error on NTHUMods's side. Then feel free to report it below. `}
        </p>
        {/* Data issue form */}
      </div>
      <EmptyIssueForm />
      <Footer />
    </div>
  );
};

export default IssuesPage;
