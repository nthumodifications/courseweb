import { Share2 } from "lucide-react";
import { Button } from "@courseweb/ui";
import { toast } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

type ShareCourseButtonProps = {
  displayName: string;
  link: string;
};
const ShareCourseButton = ({ displayName, link }: ShareCourseButtonProps) => {
  const dict = useDictionary();
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: dict.dialogs.ShareCourseButton.share_prefix + displayName,
          text: dict.dialogs.ShareCourseButton.share_text_prefix + displayName,
          url: link,
        })
        .then(() => console.log("Successful share"))
        .catch((error) => console.log("Error sharing", error));
    } else {
      // copy to clipboard
      navigator.clipboard
        .writeText(window.location.href)
        .then(() =>
          toast({
            title: dict.dialogs.ShareCourseButton.link_copied,
          }),
        )
        .catch((error) => console.log("Error copying", error));
    }
  };

  return (
    <Button variant="outline" onClick={handleShare}>
      <Share2 className="w-4 h-4 mr-2" />
      {dict.dialogs.ShareCourseButton.button}
    </Button>
  );
};

export default ShareCourseButton;
