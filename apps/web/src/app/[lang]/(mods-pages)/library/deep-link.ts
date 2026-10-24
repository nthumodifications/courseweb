import { type LibraryBranch, type SpaceCategory } from "@/lib/library";
import {
  getSearchParamValues,
  getSingleSearchParam,
  type SearchParamsLike,
} from "@/lib/search-params";

const branches: readonly LibraryBranch[] = [
  "all",
  "moonlight",
  "main",
  "hss",
  "ctm",
];
const categories: readonly SpaceCategory[] = [
  "all",
  "moonlight",
  "discussion",
  "carrel",
  "workstation",
  "av",
  "group",
];

export function getLibraryDeepLinkKey(params: SearchParamsLike): string {
  return JSON.stringify([
    getSearchParamValues(params, "branch"),
    getSearchParamValues(params, "category"),
  ]);
}

export interface LibraryDeepLinkState {
  branch: LibraryBranch;
  category: SpaceCategory;
}

export function parseLibraryDeepLink(
  params: SearchParamsLike,
): LibraryDeepLinkState {
  const branch = getSingleSearchParam(params, "branch");
  const category = getSingleSearchParam(params, "category");

  return {
    branch: branches.includes(branch as LibraryBranch)
      ? (branch as LibraryBranch)
      : "all",
    category: categories.includes(category as SpaceCategory)
      ? (category as SpaceCategory)
      : "all",
  };
}
