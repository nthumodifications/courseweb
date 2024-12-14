"use client";
import { FolderDocType, ItemDocType } from "@/config/rxdb";

export type ProcessedFolder = FolderDocType & {
  credits: number;
  courses: number;
  children?: ProcessedFolder[];
  items?: ItemDocType[];
};
