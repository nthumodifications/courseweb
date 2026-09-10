import { CheckCircle2 } from "lucide-react";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

const TermsPage = ({
  onAcceptTerms,
}: {
  onAcceptTerms: (accept: boolean) => void;
}) => {
  const dict = useDictionary();
  return (
    <div className="prose-sm">
      <p>{dict.course.details.review_terms.intro}</p>
      <div className="space-y-4">
        <div className="flex flex-row gap-2">
          <CheckCircle2 className="text-green-500 w-6 h-6" />
          <div className="flex-1">
            {dict.course.details.review_terms.accuracy}
          </div>
        </div>
        <div className="flex flex-row gap-2">
          <CheckCircle2 className="text-green-500 w-6 h-6" />
          <div className="flex-1">
            {dict.course.details.review_terms.anonymous}
          </div>
        </div>
        <div className="flex flex-row gap-2">
          <CheckCircle2 className="text-green-500 w-6 h-6" />
          <div className="flex-1">
            {dict.course.details.review_terms.access}
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-2 pt-4">
        <Button onClick={(_) => onAcceptTerms(true)}>
          {dict.course.details.review_terms.accept}
        </Button>
        <Button variant="ghost" onClick={(_) => onAcceptTerms(false)}>
          {dict.course.details.review_terms.decline}
        </Button>
      </div>
    </div>
  );
};

export default TermsPage;
