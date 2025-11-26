import type { Context } from "hono";
import type { College, GraduationRequirementsCache } from "./types";
import prismaClients from "../prisma/client";

const CACHE_KEY = "graduation_requirements";
const CACHE_TTL_HOURS = 24;

export async function getCachedRequirements(
  c: Context,
): Promise<College[] | null> {
  const prisma = await prismaClients.fetch(c.env.DB);

  const result = await prisma.cache.findUnique({
    where: { key: CACHE_KEY },
  });

  if (!result) return null;

  // Check if cache is still valid
  const updatedAt = new Date(result.updatedAt);
  const now = new Date();
  const hoursSinceUpdate =
    (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceUpdate > CACHE_TTL_HOURS) {
    return null; // Cache expired
  }

  try {
    const cached: GraduationRequirementsCache = JSON.parse(result.data);
    return cached.colleges;
  } catch {
    return null;
  }
}

export async function setCachedRequirements(
  c: Context,
  colleges: College[],
): Promise<void> {
  const prisma = await prismaClients.fetch(c.env.DB);

  const cache: GraduationRequirementsCache = {
    colleges,
    lastUpdated: new Date().toISOString(),
  };

  await prisma.cache.upsert({
    where: { key: CACHE_KEY },
    update: {
      data: JSON.stringify(cache),
    },
    create: {
      key: CACHE_KEY,
      data: JSON.stringify(cache),
    },
  });
}
