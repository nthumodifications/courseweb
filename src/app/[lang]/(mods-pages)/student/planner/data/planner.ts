import { ItemDocType, PlannerDataDocType } from "@/config/rxdb";
import { RxCollection } from "rxdb";

// // Sample planner data
// export const plannerData: PlannerDataDocType = {
//   id: "planner-1",
//   title: "電機資訊學院學士班",
//   department: "電機資訊學院",
//   requiredCredits: 128,
//   enrollmentYear: "111",
//   graduationYear: "115",
//   includedSemesters: ["111-1", "111-2", "112-1", "112-2", "113-1", "113-2", "114-1", "114-2"],
//   description: "電機資訊學院學士班畢業規劃",
//   createdAt: new Date().toISOString(),
//   updatedAt: new Date().toISOString(),
// }

// Function to get planner data
export const getPlannerData = async (col: RxCollection<PlannerDataDocType>) => {
  const results = await col.find().limit(1).exec();
  return results.length > 0 ? results[0].toMutableJSON() : undefined;
};

export const createPlannerData = async (
  col: RxCollection<PlannerDataDocType>,
  data: PlannerDataDocType,
) => {
  const existingPlanner = await getPlannerData(col);
  if (existingPlanner) throw new Error("Planner data already exists");

  await col.insert(data);
  return data;
};

// Function to update planner data
export const updatePlannerData = async (
  col: RxCollection<PlannerDataDocType>,
  data: Partial<PlannerDataDocType>,
) => {
  const planner = await col.findOne().exec();
  if (!planner) throw new Error("Planner data not found");

  await planner.patch({
    ...data,
    updatedAt: new Date().toISOString(),
  });

  return planner.toMutableJSON();
};

// Function to calculate total completed credits
export const calculateCompletedCredits = async (
  courseItems: ItemDocType[],
): Promise<number> => {
  return courseItems
    .filter((course) => course.status === "completed")
    .reduce((sum, course) => sum + course.credits, 0);
};

export const calculateInProgressCredits = async (
  courseItems: ItemDocType[],
): Promise<number> => {
  return courseItems
    .filter((course) => course.status === "in-progress")
    .reduce((sum, course) => sum + course.credits, 0);
};

// Function to calculate planned credits
export const calculatePlannedCredits = async (
  courseItems: ItemDocType[],
): Promise<number> => {
  return courseItems
    .filter((course) => course.status === "planned")
    .reduce((sum, course) => sum + course.credits, 0);
};

// Function to calculate progress percentage
export const calculateProgressPercentage = async (
  col: RxCollection<PlannerDataDocType>,
  completedCredits: number,
): Promise<number> => {
  const plannerData = await getPlannerData(col);
  if (!plannerData) return 0;

  // Ensure required credits is not zero to avoid division by zero
  if (plannerData.requiredCredits === 0) return 0;

  // Calculate progress percentage
  return (completedCredits / plannerData.requiredCredits) * 100;
};
