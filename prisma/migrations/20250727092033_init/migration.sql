-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "SubmissionLogStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('PENDING', 'FAILED', 'COMPLETED');

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "component_type" TEXT NOT NULL,
    "submit_text" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "feedback" TEXT,
    "highlights" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_media" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "sas_url" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_logs" (
    "trace_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "request_uri" TEXT NOT NULL,
    "status" "SubmissionLogStatus" NOT NULL DEFAULT 'PENDING',
    "latency" INTEGER,
    "video_file_url" TEXT,
    "video_sas_url" TEXT,
    "audio_file_url" TEXT,
    "audio_sas_url" TEXT,
    "review_prompt" TEXT,
    "review_response" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_logs_pkey" PRIMARY KEY ("trace_id")
);

-- CreateTable
CREATE TABLE "revisions" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "previous_score" INTEGER,
    "new_score" INTEGER,
    "previous_feedback" TEXT,
    "new_feedback" TEXT,
    "previous_highlights" JSONB,
    "new_highlights" JSONB,
    "status" "RevisionStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "api_latency" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_daily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "successful_submissions" INTEGER NOT NULL DEFAULT 0,
    "failed_submissions" INTEGER NOT NULL DEFAULT 0,
    "pending_submissions" INTEGER NOT NULL DEFAULT 0,
    "total_revisions" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION,
    "average_latency" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_weekly" (
    "id" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "week_end" DATE NOT NULL,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "successful_submissions" INTEGER NOT NULL DEFAULT 0,
    "failed_submissions" INTEGER NOT NULL DEFAULT 0,
    "pending_submissions" INTEGER NOT NULL DEFAULT 0,
    "total_revisions" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION,
    "average_latency" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_weekly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_monthly" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "successful_submissions" INTEGER NOT NULL DEFAULT 0,
    "failed_submissions" INTEGER NOT NULL DEFAULT 0,
    "pending_submissions" INTEGER NOT NULL DEFAULT 0,
    "total_revisions" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION,
    "average_latency" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stats_daily_date_key" ON "stats_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "stats_weekly_week_start_week_end_key" ON "stats_weekly"("week_start", "week_end");

-- CreateIndex
CREATE UNIQUE INDEX "stats_monthly_year_month_key" ON "stats_monthly"("year", "month");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_media" ADD CONSTRAINT "submission_media_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_logs" ADD CONSTRAINT "submission_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
