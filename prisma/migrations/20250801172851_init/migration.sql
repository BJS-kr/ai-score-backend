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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "component_type" TEXT NOT NULL,
    "submit_text" TEXT NOT NULL,
    "retried" BOOLEAN NOT NULL DEFAULT false,
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
    "local_video_path" TEXT,
    "local_audio_path" TEXT,
    "video_file_url" TEXT,
    "video_sas_url" TEXT,
    "audio_file_url" TEXT,
    "audio_sas_url" TEXT,
    "review_prompt" TEXT,
    "review_response" TEXT,
    "score" INTEGER,
    "feedback" TEXT,
    "highlights" JSONB,
    "highlighted_text" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_logs_pkey" PRIMARY KEY ("trace_id")
);

-- CreateTable
CREATE TABLE "external_call_logs" (
    "trace_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "task_name" TEXT NOT NULL,
    "description" TEXT,
    "request_data" JSONB,
    "response_data" JSONB,
    "success" BOOLEAN NOT NULL,
    "latency" INTEGER NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_call_logs_pkey" PRIMARY KEY ("trace_id")
);

-- CreateTable
CREATE TABLE "revisions" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_daily" (
    "id" TEXT NOT NULL,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "successful_submissions" INTEGER NOT NULL DEFAULT 0,
    "failed_submissions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_weekly" (
    "id" TEXT NOT NULL,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "successful_submissions" INTEGER NOT NULL DEFAULT 0,
    "failed_submissions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_weekly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_monthly" (
    "id" TEXT NOT NULL,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "successful_submissions" INTEGER NOT NULL DEFAULT 0,
    "failed_submissions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_monthly_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_media" ADD CONSTRAINT "submission_media_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_logs" ADD CONSTRAINT "submission_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_call_logs" ADD CONSTRAINT "external_call_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
