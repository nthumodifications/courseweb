"use client";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "../ui/use-toast";

type ShareCourseButtonProps = {
  displayName: string;
  link: string;
};
const ShareCourseButton = ({ displayName, link }: ShareCourseButtonProps) => {
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "分享:" + displayName,
          text: `Check out this course: ${displayName}`,
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
            title: "Link copied to clipboard",
          }),
        )
        .catch((error) => console.log("Error copying", error));
    }
  };

  return (
    <Button variant="outline" onClick={handleShare}>
      <Share2 className="w-4 h-4 mr-2" />
      分享
    </Button>
  );
};

export default ShareCourseButton;
