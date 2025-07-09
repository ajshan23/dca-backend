/*
  Warnings:

  - You are about to drop the column `serialNumber` on the `products` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
ALTER TABLE [dbo].[products] DROP CONSTRAINT [products_serialNumber_key];

-- AlterTable
ALTER TABLE [dbo].[products] DROP COLUMN [serialNumber];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
