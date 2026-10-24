import { type LibraryBranch, type SpaceCategory } from "@/lib/library";
import {
  getSearchParamValues,
  getSingleSearchParam,
  type SearchParamsLike,
} from "@/lib/deep-links/search-params";

export const LIBRARY_BRANCHES: readonly LibraryBranch[] = [
  "all",
  "moonlight",
  "main",
  "hss",
  "ctm",
];
export const LIBRARY_CATEGORIES: readonly SpaceCategory[] = [
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
    branch: LIBRARY_BRANCHES.includes(branch as LibraryBranch)
      ? (branch as LibraryBranch)
      : "all",
    category: LIBRARY_CATEGORIES.includes(category as SpaceCategory)
      ? (category as SpaceCategory)
      : "all",
  };
}
