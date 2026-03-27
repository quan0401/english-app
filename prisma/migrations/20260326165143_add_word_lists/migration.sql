-- CreateTable
CREATE TABLE "word_lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT DEFAULT '📚',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_list_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "word_lists_userId_name_key" ON "word_lists"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "word_list_items_listId_wordId_key" ON "word_list_items"("listId", "wordId");

-- AddForeignKey
ALTER TABLE "word_lists" ADD CONSTRAINT "word_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "word_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
