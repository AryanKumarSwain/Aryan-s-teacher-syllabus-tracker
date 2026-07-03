/*
  Warnings:

  - The primary key for the `academic_terms` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `academic_terms` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `academic_terms` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `name` on the `academic_terms` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - The primary key for the `activity_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `activity_logs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `activity_logs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `user_id` on the `activity_logs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `entity_id` on the `activity_logs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `actor_id` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `entity_id` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `chapter_progress` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `chapter_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `chapter_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `chapter_id` on the `chapter_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `teacher_id` on the `chapter_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `updated_by` on the `chapter_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `chapters` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `chapters` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `chapters` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `subject_id` on the `chapters` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `class_id` on the `chapters` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `classes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `name` on the `classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `grade` on the `classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `section` on the `classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `user_id` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `refresh_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `refresh_tokens` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `user_id` on the `refresh_tokens` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `schools` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `schools` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `subjects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `subjects` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `subjects` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `class_id` on the `subjects` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `name` on the `subjects` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.
  - You are about to alter the column `code` on the `subjects` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `color` on the `subjects` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `subscription_plans` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `subscription_plans` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `subscriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `subscriptions` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `subscriptions` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `plan_id` on the `subscriptions` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `teacher_classes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `teacher_classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `teacher_classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `teacher_id` on the `teacher_classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `class_id` on the `teacher_classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `subject_id` on the `teacher_classes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `teachers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `teachers` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `teachers` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `user_id` on the `teachers` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `topic_progress` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `topic_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `topic_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `topic_id` on the `topic_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `teacher_id` on the `topic_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `updated_by` on the `topic_progress` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `topics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `topics` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `topics` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `chapter_id` on the `topics` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `school_id` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - The primary key for the `vacation_days` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `vacation_days` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - You are about to alter the column `academic_term_id` on the `vacation_days` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - A unique constraint covering the columns `[school_id,academic_session_id]` on the table `academic_terms` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[school_id,academic_session_id,name,section]` on the table `classes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[school_id,academic_session_id,class_id,name]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teacher_id,class_id,subject_id,school_id,academic_session_id]` on the table `teacher_classes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academic_session_id` to the `academic_terms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academic_session_id` to the `chapters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academic_session_id` to the `classes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academic_session_id` to the `subjects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academic_session_id` to the `teacher_classes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academic_session_id` to the `topics` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `academic_terms` DROP FOREIGN KEY `academic_terms_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `activity_logs` DROP FOREIGN KEY `activity_logs_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `activity_logs` DROP FOREIGN KEY `activity_logs_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_actor_id_fkey`;

-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `chapter_progress` DROP FOREIGN KEY `chapter_progress_chapter_id_fkey`;

-- DropForeignKey
ALTER TABLE `chapter_progress` DROP FOREIGN KEY `chapter_progress_teacher_id_fkey`;

-- DropForeignKey
ALTER TABLE `chapter_progress` DROP FOREIGN KEY `chapter_progress_updated_by_fkey`;

-- DropForeignKey
ALTER TABLE `chapters` DROP FOREIGN KEY `chapters_class_id_fkey`;

-- DropForeignKey
ALTER TABLE `chapters` DROP FOREIGN KEY `chapters_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `chapters` DROP FOREIGN KEY `chapters_subject_id_fkey`;

-- DropForeignKey
ALTER TABLE `classes` DROP FOREIGN KEY `classes_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `refresh_tokens_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `subjects` DROP FOREIGN KEY `subjects_class_id_fkey`;

-- DropForeignKey
ALTER TABLE `subjects` DROP FOREIGN KEY `subjects_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `subscriptions` DROP FOREIGN KEY `subscriptions_plan_id_fkey`;

-- DropForeignKey
ALTER TABLE `subscriptions` DROP FOREIGN KEY `subscriptions_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_classes` DROP FOREIGN KEY `teacher_classes_class_id_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_classes` DROP FOREIGN KEY `teacher_classes_subject_id_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_classes` DROP FOREIGN KEY `teacher_classes_teacher_id_fkey`;

-- DropForeignKey
ALTER TABLE `teachers` DROP FOREIGN KEY `teachers_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `teachers` DROP FOREIGN KEY `teachers_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `topic_progress` DROP FOREIGN KEY `topic_progress_teacher_id_fkey`;

-- DropForeignKey
ALTER TABLE `topic_progress` DROP FOREIGN KEY `topic_progress_topic_id_fkey`;

-- DropForeignKey
ALTER TABLE `topic_progress` DROP FOREIGN KEY `topic_progress_updated_by_fkey`;

-- DropForeignKey
ALTER TABLE `topics` DROP FOREIGN KEY `topics_chapter_id_fkey`;

-- DropForeignKey
ALTER TABLE `topics` DROP FOREIGN KEY `topics_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_school_id_fkey`;

-- DropForeignKey
ALTER TABLE `vacation_days` DROP FOREIGN KEY `vacation_days_academic_term_id_fkey`;

-- DropIndex
DROP INDEX `classes_school_id_name_section_key` ON `classes`;

-- DropIndex
DROP INDEX `subjects_school_id_class_id_name_key` ON `subjects`;

-- DropIndex
DROP INDEX `teacher_classes_teacher_id_class_id_subject_id_school_id_key` ON `teacher_classes`;

-- AlterTable
ALTER TABLE `academic_terms` DROP PRIMARY KEY,
    ADD COLUMN `academic_session_id` VARCHAR(50) NOT NULL,
    ADD COLUMN `terms` JSON NOT NULL,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `name` VARCHAR(100) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `activity_logs` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NULL,
    MODIFY `user_id` VARCHAR(50) NOT NULL,
    MODIFY `entity_id` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `audit_logs` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NULL,
    MODIFY `actor_id` VARCHAR(50) NOT NULL,
    MODIFY `entity_id` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `chapter_progress` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `chapter_id` VARCHAR(50) NOT NULL,
    MODIFY `teacher_id` VARCHAR(50) NOT NULL,
    MODIFY `updated_by` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `chapters` DROP PRIMARY KEY,
    ADD COLUMN `academic_session_id` VARCHAR(50) NOT NULL,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `subject_id` VARCHAR(50) NOT NULL,
    MODIFY `class_id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `classes` DROP PRIMARY KEY,
    ADD COLUMN `academic_session_id` VARCHAR(50) NOT NULL,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `name` VARCHAR(100) NOT NULL,
    MODIFY `grade` VARCHAR(50) NULL,
    MODIFY `section` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `notifications` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NULL,
    MODIFY `user_id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `refresh_tokens` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `user_id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `schools` DROP PRIMARY KEY,
    ADD COLUMN `current_academic_session_id` VARCHAR(50) NULL,
    MODIFY `id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `subjects` DROP PRIMARY KEY,
    ADD COLUMN `academic_session_id` VARCHAR(50) NOT NULL,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `class_id` VARCHAR(50) NULL,
    MODIFY `name` VARCHAR(100) NOT NULL,
    MODIFY `code` VARCHAR(50) NULL,
    MODIFY `color` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `subscription_plans` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `subscriptions` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `plan_id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `teacher_classes` DROP PRIMARY KEY,
    ADD COLUMN `academic_session_id` VARCHAR(50) NOT NULL,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `teacher_id` VARCHAR(50) NOT NULL,
    MODIFY `class_id` VARCHAR(50) NOT NULL,
    MODIFY `subject_id` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `teachers` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `user_id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `topic_progress` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `topic_id` VARCHAR(50) NOT NULL,
    MODIFY `teacher_id` VARCHAR(50) NOT NULL,
    MODIFY `updated_by` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `topics` DROP PRIMARY KEY,
    ADD COLUMN `academic_session_id` VARCHAR(50) NOT NULL,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NOT NULL,
    MODIFY `chapter_id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `school_id` VARCHAR(50) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `vacation_days` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(50) NOT NULL,
    MODIFY `academic_term_id` VARCHAR(50) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- CreateTable
CREATE TABLE `academic_sessions` (
    `id` VARCHAR(50) NOT NULL,
    `school_id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `academic_sessions_school_id_idx`(`school_id`),
    INDEX `academic_sessions_status_idx`(`status`),
    UNIQUE INDEX `academic_sessions_school_id_name_key`(`school_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `academic_terms_academic_session_id_idx` ON `academic_terms`(`academic_session_id`);

-- CreateIndex
CREATE UNIQUE INDEX `academic_terms_school_id_academic_session_id_key` ON `academic_terms`(`school_id`, `academic_session_id`);

-- CreateIndex
CREATE INDEX `chapters_academic_session_id_idx` ON `chapters`(`academic_session_id`);

-- CreateIndex
CREATE INDEX `classes_academic_session_id_idx` ON `classes`(`academic_session_id`);

-- CreateIndex
CREATE UNIQUE INDEX `classes_school_id_academic_session_id_name_section_key` ON `classes`(`school_id`, `academic_session_id`, `name`, `section`);

-- CreateIndex
CREATE INDEX `schools_current_academic_session_id_idx` ON `schools`(`current_academic_session_id`);

-- CreateIndex
CREATE INDEX `subjects_academic_session_id_idx` ON `subjects`(`academic_session_id`);

-- CreateIndex
CREATE UNIQUE INDEX `subjects_school_id_academic_session_id_class_id_name_key` ON `subjects`(`school_id`, `academic_session_id`, `class_id`, `name`);

-- CreateIndex
CREATE INDEX `teacher_classes_academic_session_id_idx` ON `teacher_classes`(`academic_session_id`);

-- CreateIndex
CREATE UNIQUE INDEX `teacher_classes_teacher_id_class_id_subject_id_school_id_aca_key` ON `teacher_classes`(`teacher_id`, `class_id`, `subject_id`, `school_id`, `academic_session_id`);

-- CreateIndex
CREATE INDEX `topics_academic_session_id_idx` ON `topics`(`academic_session_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_sessions` ADD CONSTRAINT `academic_sessions_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_academic_session_id_fkey` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_academic_session_id_fkey` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_academic_session_id_fkey` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topics` ADD CONSTRAINT `topics_academic_session_id_fkey` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topics` ADD CONSTRAINT `topics_chapter_id_fkey` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topics` ADD CONSTRAINT `topics_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_classes` ADD CONSTRAINT `teacher_classes_academic_session_id_fkey` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_classes` ADD CONSTRAINT `teacher_classes_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_classes` ADD CONSTRAINT `teacher_classes_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_classes` ADD CONSTRAINT `teacher_classes_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapter_progress` ADD CONSTRAINT `chapter_progress_chapter_id_fkey` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapter_progress` ADD CONSTRAINT `chapter_progress_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapter_progress` ADD CONSTRAINT `chapter_progress_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_progress` ADD CONSTRAINT `topic_progress_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_progress` ADD CONSTRAINT `topic_progress_topic_id_fkey` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_progress` ADD CONSTRAINT `topic_progress_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_terms` ADD CONSTRAINT `academic_terms_academic_session_id_fkey` FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_terms` ADD CONSTRAINT `academic_terms_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vacation_days` ADD CONSTRAINT `vacation_days_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
