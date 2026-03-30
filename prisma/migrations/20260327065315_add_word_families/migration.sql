-- AlterTable
ALTER TABLE "words" ADD COLUMN     "familyId" TEXT;

-- CreateTable
CREATE TABLE "word_families" (
    "id" TEXT NOT NULL,
    "rootWord" TEXT NOT NULL,

    CONSTRAINT "word_families_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "word_families_rootWord_key" ON "word_families"("rootWord");

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "word_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;
