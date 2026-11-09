CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "OrganisationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "OrganisationMemberRole" AS ENUM ('OWNER', 'MANAGER', 'APPROVER');
CREATE TYPE "SpaceWhoCanBook" AS ENUM ('ANYONE_SIGNED_IN', 'NTHU_ONLY', 'MEMBERS', 'ALLOW_LIST');
CREATE TYPE "SpaceApprovalMode" AS ENUM ('APPROVAL', 'INSTANT');
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'NO_SHOW');

CREATE TABLE "organisation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "status" "OrganisationStatus" NOT NULL DEFAULT 'PENDING',
  "created_by" TEXT NOT NULL,
  "discord_webhook_url" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organisation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organisation_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "organisation_slug_key" ON "organisation"("slug");
CREATE INDEX "organisation_status_created_at_idx" ON "organisation"("status", "created_at");

CREATE TABLE "organisation_member" (
  "id" TEXT NOT NULL,
  "organisation_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "OrganisationMemberRole" NOT NULL DEFAULT 'APPROVER',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organisation_member_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organisation_member_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organisation_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "organisation_member_organisation_id_user_id_key" ON "organisation_member"("organisation_id", "user_id");
CREATE INDEX "organisation_member_user_id_role_idx" ON "organisation_member"("user_id", "role");

CREATE TABLE "space" (
  "id" TEXT NOT NULL,
  "organisation_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "venue_id" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT true,
  "rules" TEXT NOT NULL,
  "who_can_book" "SpaceWhoCanBook" NOT NULL DEFAULT 'ANYONE_SIGNED_IN',
  "approval_mode" "SpaceApprovalMode" NOT NULL DEFAULT 'APPROVAL',
  "slot_length_minutes" INTEGER NOT NULL DEFAULT 60,
  "min_notice_hours" INTEGER NOT NULL DEFAULT 0,
  "max_length_minutes" INTEGER NOT NULL DEFAULT 240,
  "max_active_bookings_per_user" INTEGER NOT NULL DEFAULT 3,
  "require_borrowing_unit" BOOLEAN NOT NULL DEFAULT false,
  "require_purpose" BOOLEAN NOT NULL DEFAULT true,
  "require_headcount" BOOLEAN NOT NULL DEFAULT false,
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "space_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "space_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "space_slot_length_minutes_check" CHECK ("slot_length_minutes" > 0),
  CONSTRAINT "space_max_length_minutes_check" CHECK ("max_length_minutes" > 0),
  CONSTRAINT "space_max_active_bookings_check" CHECK ("max_active_bookings_per_user" > 0),
  CONSTRAINT "space_min_notice_hours_check" CHECK ("min_notice_hours" >= 0)
);
CREATE UNIQUE INDEX "space_organisation_id_slug_key" ON "space"("organisation_id", "slug");
CREATE INDEX "space_organisation_id_archived_at_idx" ON "space"("organisation_id", "archived_at");

CREATE TABLE "space_opening_hours" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "opens_at" TEXT NOT NULL,
  "closes_at" TEXT NOT NULL,
  CONSTRAINT "space_opening_hours_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "space_opening_hours_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "space_opening_hours_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
  CONSTRAINT "space_opening_hours_time_check" CHECK ("opens_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "closes_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "opens_at" < "closes_at")
);
CREATE UNIQUE INDEX "space_opening_hours_space_id_weekday_key" ON "space_opening_hours"("space_id", "weekday");

CREATE TABLE "space_blackout" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "reason" TEXT,
  CONSTRAINT "space_blackout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "space_blackout_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "space_blackout_date_check" CHECK ("start_date" <= "end_date")
);
CREATE INDEX "space_blackout_space_id_start_date_end_date_idx" ON "space_blackout"("space_id", "start_date", "end_date");

CREATE TABLE "space_booking_allow_list" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "space_booking_allow_list_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "space_booking_allow_list_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "space_booking_allow_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "space_booking_allow_list_space_id_user_id_key" ON "space_booking_allow_list"("space_id", "user_id");

CREATE TABLE "booking" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "start_at" TIMESTAMPTZ(3) NOT NULL,
  "end_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
  "borrowing_unit" TEXT,
  "purpose" TEXT,
  "headcount" INTEGER,
  "notes" TEXT,
  "decided_by" TEXT,
  "decided_at" TIMESTAMPTZ(3),
  "reason" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "booking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "booking_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "booking_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "booking_range_check" CHECK ("start_at" < "end_at"),
  CONSTRAINT "booking_headcount_check" CHECK ("headcount" IS NULL OR "headcount" > 0)
);
CREATE INDEX "booking_space_id_start_at_end_at_idx" ON "booking"("space_id", "start_at", "end_at");
CREATE INDEX "booking_user_id_status_start_at_idx" ON "booking"("user_id", "status", "start_at");

-- The database is the final concurrency boundary for approvals. Half-open
-- ranges allow one booking to begin exactly when the previous one ends.
ALTER TABLE "booking"
  ADD CONSTRAINT "booking_no_overlapping_approved"
  EXCLUDE USING gist (
    "space_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  ) WHERE ("status" = 'APPROVED');

CREATE TABLE "booking_event" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "who_user_id" TEXT,
  "what" TEXT NOT NULL,
  "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "details" JSONB,
  CONSTRAINT "booking_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "booking_event_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "booking_event_booking_id_at_idx" ON "booking_event"("booking_id", "at");
