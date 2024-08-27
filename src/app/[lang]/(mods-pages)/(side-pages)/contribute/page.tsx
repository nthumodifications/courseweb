import { Button } from "@/components/ui/button";
import {
  BugIcon,
  Github,
  Instagram,
  Lightbulb,
  Mail,
  Paperclip,
} from "lucide-react";
import Link from "next/link";
import ContributeComment from "./ContributeComment";
import IssueFormDialog from "@/components/Forms/IssueFormDialog";
import Footer from "@/components/Footer";

const ContributePage = () => {
  return (
    <div className="px-4">
      <article className="prose prose-neutral dark:prose-invert">
        <h1>Be a Contributor</h1>
        <p>
          NTHUMods is a 100% pure student-led, open source project. We rely on
          the support of our contributors, and NTHU students to keep this
          platform alive. Many students have provided critical feedback and
          suggested improvements that have shaped how NTHUMods is. No matter
          your background, we welcome you to contribute to this platform!
        </p>

        <h1>For Everyone</h1>
        <h2>Share your experiences</h2>
        <p>{`You've took a fair share of courses, so share how your courses went to all students. Every insight that you can provide brings value to NTHUMods!`}</p>
        <ContributeComment />
        <h2>Share your feedback</h2>
        <p>
          We are always open for feedback! If you have any suggestions, ideas,
          or feedback, or you think this particular shade of purple looks ugly!
          Let us know using the links below.
        </p>
        <div className="flex flex-row gap-2 mb-8">
          <IssueFormDialog>
            <div className="rounded-md hover:shadow-md transition-shadow cursor-pointer  bg-neutral-800 text-white grid place-items-center w-28 h-28">
              <div className="flex flex-col items-center gap-2">
                <Paperclip />
                <div className="text-sm no-underline">Form</div>
              </div>
            </div>
          </IssueFormDialog>
          <Link href="mailto:nthumods@gmail.com">
            <div className="rounded-md hover:shadow-md transition-shadow cursor-pointer  bg-red-600 text-white grid place-items-center w-28 h-28">
              <div className="flex flex-col items-center gap-2">
                <Mail />
                <div className="text-sm no-underline">Email</div>
              </div>
            </div>
          </Link>
          <Link href="https://instagram.com/nthumods">
            <div className="rounded-md hover:shadow-md transition-shadow cursor-pointer  bg-[#515BD4] text-white grid place-items-center w-28 h-28">
              <div className="flex flex-col items-center gap-2">
                <Instagram />
                <div className="text-sm no-underline">Instagram</div>
              </div>
            </div>
          </Link>
        </div>

        <h1>For Developers</h1>
        <h2>File Bug Reports and Feature Requests</h2>
        <p>
          Found a bug? Want to see a new feature? File an issue on our GitHub
          repository!
        </p>
        <div className="flex flex-row gap-2 mb-8">
          <Link href="https://github.com/nthumodifications/courseweb/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=">
            <div className="rounded-md hover:shadow-md transition-shadow cursor-pointer p-4 bg-neutral-800 text-white flex flex-row items-center gap-4">
              <BugIcon />
              <div className="flex flex-col">
                <div className="font-bold">Bug</div>
                <div className="text-sm">Report a bug on Github</div>
              </div>
            </div>
          </Link>
          <Link
            href="https://github.com/nthumodifications/courseweb/issues/new?assignees=&labels=&projects=&template=feature_request.md&title="
            className="text-inherit no-underline"
          >
            <div className="rounded-md hover:shadow-md transition-shadow cursor-pointer p-4 bg-neutral-800 text-white flex flex-row items-center gap-4">
              <Lightbulb />
              <div className="flex flex-col">
                <div className="font-bold">Feature</div>
                <div className="text-sm">Submit a Feature Idea</div>
              </div>
            </div>
          </Link>
        </div>

        <h2>Contribute Code and Design</h2>
        <p>
          Wish to directly help us code/design NTHUMods? We welcome all
          contributors, no matter your level. Try getting started by looking at
          good first issues! And join your Discord server for any discussions!
        </p>
        <Button variant="outline" asChild>
          <Link href="https://github.com/nthumodifications/courseweb">
            <Github />
            <span>GitHub</span>
          </Link>
        </Button>
      </article>
      <Footer />
    </div>
  );
};

export default ContributePage;
