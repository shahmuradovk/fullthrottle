-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "data" BYTEA,
ADD COLUMN     "sourceUrl" TEXT;
