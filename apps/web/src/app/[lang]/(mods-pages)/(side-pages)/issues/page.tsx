import EmptyIssueForm from "./EmptyIssueForm";
import Footer from "@/components/Footer";
import useDictionary from "@/dictionaries/useDictionary";

const IssuesPage = () => {
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-4 px-4">
      <div id="dataissue" className="flex flex-col gap-4">
        {/* Explainer of the data sources */}
        <h1 className="text-base font-bold">{dict.issues.data_sources}</h1>
        <p className="leading-relaxed">{dict.issues.introduction}</p>
        <div className="flex flex-col divide-y divide-border">
          <div className="flex flex-col gap-1 py-4">
            <div className="font-bold">{dict.issues.sources.course_data}</div>
            <a
              className="text-muted-foreground text-sm"
              href="https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json"
              target="_blank"
            >
              https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/OPENDATA/open_course_data.json
            </a>
          </div>
          <div className="flex flex-col gap-1 py-4">
            <div className="font-bold">{dict.issues.sources.course_list}</div>
            <a
              className="text-muted-foreground text-sm"
              href="https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629001.php"
              target="_blank"
            >
              https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/6/6.2/6.2.9/JH629001.php
            </a>
          </div>
          <div className="flex flex-col gap-1 py-4">
            <div className="font-bold">{dict.issues.sources.course_stats}</div>
            <a
              className="text-muted-foreground text-sm"
              href="https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/8.4/8.4.2/JH84201.php"
              target="_blank"
            >
              https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/8.4/8.4.2/JH84201.php
            </a>
          </div>
        </div>
        <p className="leading-relaxed">{dict.issues.update_notice}</p>
        {/* Data issue form */}
      </div>
      <EmptyIssueForm />
      <Footer />
    </div>
  );
};

export default IssuesPage;
