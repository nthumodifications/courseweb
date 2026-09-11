import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Record an administrative write.
 *
 * Failures are swallowed on purpose: an audit row that cannot be written is
 * worth a log line, but it is not worth failing a ban that has already been
 * applied, which would leave the caller unsure whether the action took effect.
 */
export async function recordAdminAction(entry: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    console.error("Failed to write admin audit log", entry.action, error);
  }
}
