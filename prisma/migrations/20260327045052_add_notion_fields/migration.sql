-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastNotionSync" TIMESTAMP(3),
ADD COLUMN     "notionAccessToken" TEXT,
ADD COLUMN     "notionListDbId" TEXT,
ADD COLUMN     "notionNotesDbId" TEXT,
ADD COLUMN     "notionPageId" TEXT,
ADD COLUMN     "notionProgressDbId" TEXT,
ADD COLUMN     "notionWordDbId" TEXT,
ADD COLUMN     "notionWorkspaceId" TEXT;
