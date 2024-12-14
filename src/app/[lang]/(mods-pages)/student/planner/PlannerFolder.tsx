"use client";
import { cn } from "@/lib/utils";
import { ItemContainer } from "./ItemContainer";
import { ProcessedFolder } from "./ProcessedFolder";
import PlannerItem from "./PlannerItem";

export const PlannerFolder = ({ folder }: { folder: ProcessedFolder }) => {
  return (
    <div
      className={cn(
        "flex w-full border border-border divide-border",
        folder.titlePlacement == "top"
          ? "flex-col divide-y"
          : "flex-row divide-x",
      )}
    >
      <div className="flex flex-col p-1">
        <div className="text-sm">{folder.title}</div>
        <div className="text-xs">
          {/* green color circle if fullfilled, else red */}
          <div
            className={cn(
              "w-2 h-2 rounded-full inline-block",
              folder.credits >= folder.min &&
                (folder.credits <= folder.max || folder.max == -1)
                ? "bg-green-500"
                : "bg-red-500",
            )}
          ></div>{" "}
          {folder.credits} / {folder.min} -{" "}
          {folder.max == -1 ? "∞" : folder.max}
        </div>
      </div>
      <div className="flex flex-col flex-1">
        {folder.children?.map((child) => (
          <PlannerFolder key={child.id} folder={child} />
        ))}
        {!folder.children && (
          <ItemContainer id={folder.id}>
            {folder.items?.map((item) => (
              <PlannerItem key={item.id} item={item} />
            ))}
          </ItemContainer>
        )}
      </div>
    </div>
  );
};
