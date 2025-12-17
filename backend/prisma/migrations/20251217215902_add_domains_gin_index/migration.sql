-- CreateIndex: GIN index for efficient array queries on domains column
CREATE INDEX "entries_domains_gin_idx" ON "entries" USING GIN ("domains");