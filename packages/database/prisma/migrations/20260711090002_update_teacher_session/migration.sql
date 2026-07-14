/*
  Warnings:

  - A unique constraint covering the columns `[school_id,chapter_id,teacher_id,academic_session_id]` on the table `chapter_progress` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[school_id,user_id,academic_session_id]` on the table `teachers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[school_id,topic_id,teacher_id,academic_session_id]` on the table `topic_progress` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academic_session_id` to the `chapter_progress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academic_session_id` to the `topic_progress` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `teachers` DROP FOREIGN KEY `teachers_school_id_fkey`;

-- DropIndex
DROP INDEX `chapter_progress_school_id_chapter_id_teacher_id_key` ON `chapter_progress`;

-- DropIndex
DROP INDEX `teachers_school_id_user_id_key` ON `teachers`;

-- DropIndex
DROP INDEX `topic_progress_school_id_topic_id_teacher_id_key` ON `topic_progress`;

-- AlterTable
ALTER TABLE `chapter_progress` ADD COLUMN `academic_session_id` VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE `teachers` ADD COLUMN `academic_session_id` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `topic_progress` ADD COLUMN `academic_session_id` VARCHAR(50) NOT NULL;

-- CreateIndex
CREATE INDEX `chapter_progress_academic_session_id_idx` ON `chapter_progress`(`academic_session_id`);

-- CreateIndex
CREATE UNIQUE INDEX `chapter_progress_school_id_chapter_id_teacher_id_academic_se_key` ON `chapter_progress`(`school_id`, `chapter_id`, `teacher_id`, `academic_session_id`);

-- CreateIndex
CREATE INDEX `teachers_academic_session_id_idx` ON `teachers`(`academic_session_id`);

-- CreateIndex
CREATE UNIQUE INDEX `teachers_school_id_user_id_academic_session_id_key` ON `teachers`(`school_id`, `user_id`, `academic_session_id`);

-- CreateIndex
CREATE INDEX `topic_progress_academic_session_id_idx` ON `topic_progress`(`academic_session_id`);

-- CreateIndex
CREATE UNIQUE INDEX `topic_progress_school_id_topic_id_teacher_id_academic_sessio_key` ON `topic_progress`(`school_id`, `topic_id`, `teacher_id`, `academic_session_id`);

-- AddForeignKey
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_academic_session_id_fkey` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapter_progress` ADD CONSTRAINT `chapter_progress_academic_session_id_fkey` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_progress` ADD CONSTRAINT `topic_progress_academic_session_id_fkey` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
