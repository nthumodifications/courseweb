import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsPage = ({
  onAcceptTerms,
}: {
  onAcceptTerms: (accept: boolean) => void;
}) => {
  return (
    <div className="prose-sm">
      <p>同學們好～為了讓大家獲得準確有意義的評價：</p>
      <div className="space-y-4">
        <div className="flex flex-row gap-2">
          <CheckCircle2 className="text-green-500 w-6 h-6" />
          <div className="flex-1">
            請確保分享內容的真實與客觀性，並且不要人身攻擊
          </div>
        </div>
        <div className="flex flex-row gap-2">
          <CheckCircle2 className="text-green-500 w-6 h-6" />
          <div className="flex-1">
            此為匿名分享，但為了防止有心人士濫用，我們會在後台記錄分享者的學號，若違反規則我們會禁止該學號者留言
          </div>
        </div>
        <div className="flex flex-row gap-2">
          <CheckCircle2 className="text-green-500 w-6 h-6" />
          <div className="flex-1">
            只有成功代理登陸校務系統的同學才能留言和看到他人的留言
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-2 pt-4">
        <Button onClick={(_) => onAcceptTerms(true)}>我已閱讀並同意</Button>
        <Button variant="ghost" onClick={(_) => onAcceptTerms(false)}>
          不同意
        </Button>
      </div>
    </div>
  );
};

export default TermsPage;
