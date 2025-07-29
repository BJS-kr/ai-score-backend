/*
  Warnings:

  - You are about to drop the column `api_latency` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `new_feedback` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `new_highlights` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `new_score` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `previous_feedback` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `previous_highlights` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `previous_score` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `average_latency` on the `stats_daily` table. All the data in the column will be lost.
  - You are about to drop the column `average_score` on the `stats_daily` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `stats_daily` table. All the data in the column will be lost.
  - You are about to drop the column `pending_submissions` on the `stats_daily` table. All the data in the column will be lost.
  - You are about to drop the column `total_revisions` on the `stats_daily` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `stats_daily` table. All the data in the column will be lost.
  - You are about to drop the column `average_latency` on the `stats_monthly` table. All the data in the column will be lost.
  - You are about to drop the column `average_score` on the `stats_monthly` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `stats_monthly` table. All the data in the column will be lost.
  - You are about to drop the column `pending_submissions` on the `stats_monthly` table. All the data in the column will be lost.
  - You are about to drop the column `total_revisions` on the `stats_monthly` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `stats_monthly` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `stats_monthly` table. All the data in the column will be lost.
  - You are about to drop the column `average_latency` on the `stats_weekly` table. All the data in the column will be lost.
  - You are about to drop the column `average_score` on the `stats_weekly` table. All the data in the column will be lost.
  - You are about to drop the column `pending_submissions` on the `stats_weekly` table. All the data in the column will be lost.
  - You are about to drop the column `total_revisions` on the `stats_weekly` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `stats_weekly` table. All the data in the column will be lost.
  - You are about to drop the column `week_end` on the `stats_weekly` table. All the data in the column will be lost.
  - You are about to drop the column `week_start` on the `stats_weekly` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "stats_daily_date_key";

-- DropIndex
DROP INDEX "stats_monthly_year_month_key";

-- DropIndex
DROP INDEX "stats_weekly_week_start_week_end_key";

-- AlterTable
ALTER TABLE "revisions" DROP COLUMN "api_latency",
DROP COLUMN "new_feedback",
DROP COLUMN "new_highlights",
DROP COLUMN "new_score",
DROP COLUMN "previous_feedback",
DROP COLUMN "previous_highlights",
DROP COLUMN "previous_score",
DROP COLUMN "reason",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "stats_daily" DROP COLUMN "average_latency",
DROP COLUMN "average_score",
DROP COLUMN "date",
DROP COLUMN "pending_submissions",
DROP COLUMN "total_revisions",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "stats_monthly" DROP COLUMN "average_latency",
DROP COLUMN "average_score",
DROP COLUMN "month",
DROP COLUMN "pending_submissions",
DROP COLUMN "total_revisions",
DROP COLUMN "updated_at",
DROP COLUMN "year";

-- AlterTable
ALTER TABLE "stats_weekly" DROP COLUMN "average_latency",
DROP COLUMN "average_score",
DROP COLUMN "pending_submissions",
DROP COLUMN "total_revisions",
DROP COLUMN "updated_at",
DROP COLUMN "week_end",
DROP COLUMN "week_start";

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "retried" BOOLEAN NOT NULL DEFAULT false;
