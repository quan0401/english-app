-- CreateTable
CREATE TABLE "word_of_day" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_of_day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "word_of_day_date_key" ON "word_of_day"("date");

-- AddForeignKey
ALTER TABLE "word_of_day" ADD CONSTRAINT "word_of_day_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
