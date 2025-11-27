import { Metadata } from "next";
import { ChatPageContent } from "./ChatPageContent";

export const metadata: Metadata = {
  title: "AI 課程助手 | NTHUMods",
  description: "使用 AI 助手搜尋課程、規劃課表、查詢畢業學分",
};

export default function CourseChatPage() {
  return <ChatPageContent />;
}
