-- AlterTable
ALTER TABLE "submission_logs" ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "highlights" JSONB,
ADD COLUMN     "score" INTEGER;
