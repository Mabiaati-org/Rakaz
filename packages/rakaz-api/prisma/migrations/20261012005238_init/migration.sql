-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'DRIVER', 'GUARDIAN') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `deletionRequestedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_phone_key`(`phone`),
    INDEX `User_role_deletedAt_idx`(`role`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RefreshToken_tokenHash_key`(`tokenHash`),
    INDEX `RefreshToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeviceToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `platform` ENUM('IOS', 'ANDROID', 'WEB') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeviceToken_token_key`(`token`),
    INDEX `DeviceToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vehicleLabel` VARCHAR(191) NOT NULL,
    `plateNumber` VARCHAR(191) NOT NULL,
    `vehicleModel` VARCHAR(191) NOT NULL DEFAULT '',
    `vehicleColor` VARCHAR(191) NOT NULL DEFAULT '',
    `vehicleCapacity` INTEGER NULL,
    `hiredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DriverProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `School` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `locationLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `startTime` VARCHAR(191) NOT NULL DEFAULT '07:45',
    `endTime` VARCHAR(191) NOT NULL DEFAULT '13:15',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Route` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NULL,
    `depotLat` DOUBLE NULL,
    `depotLng` DOUBLE NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Route_code_key`(`code`),
    UNIQUE INDEX `Route_driverId_key`(`driverId`),
    INDEX `Route_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Student` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `internalNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `fullName` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(191) NOT NULL DEFAULT '',
    `stage` VARCHAR(191) NOT NULL DEFAULT '',
    `gender` ENUM('MALE', 'FEMALE') NULL,
    `birthDate` DATE NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NULL,
    `guardianId` VARCHAR(191) NULL,
    `guardianName` VARCHAR(191) NOT NULL,
    `guardianPhone` VARCHAR(191) NOT NULL,
    `governorate` VARCHAR(191) NOT NULL DEFAULT '',
    `area` VARCHAR(191) NOT NULL DEFAULT '',
    `neighborhood` VARCHAR(191) NOT NULL DEFAULT '',
    `street` VARCHAR(191) NOT NULL DEFAULT '',
    `landmark` VARCHAR(191) NOT NULL DEFAULT '',
    `accessNotes` VARCHAR(191) NOT NULL DEFAULT '',
    `homeLat` DOUBLE NOT NULL,
    `homeLng` DOUBLE NOT NULL,
    `notes` VARCHAR(1000) NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Student_code_key`(`code`),
    INDEX `Student_schoolId_idx`(`schoolId`),
    INDEX `Student_routeId_idx`(`routeId`),
    INDEX `Student_guardianId_idx`(`guardianId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RouteStop` (
    `id` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `pickupTime` VARCHAR(191) NOT NULL DEFAULT '07:00',
    `dropoffTime` VARCHAR(191) NOT NULL DEFAULT '13:30',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RouteStop_studentId_key`(`studentId`),
    INDEX `RouteStop_routeId_sequence_idx`(`routeId`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trip` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `kind` ENUM('MORNING', 'AFTERNOON') NOT NULL,
    `date` DATE NOT NULL,
    `phase` ENUM('NOT_STARTED', 'IN_PROGRESS', 'AT_SCHOOL', 'FINISHED') NOT NULL DEFAULT 'NOT_STARTED',
    `driverId` VARCHAR(191) NULL,
    `vehicleLabel` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NULL,
    `arrivedSchoolAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `busLat` DOUBLE NULL,
    `busLng` DOUBLE NULL,
    `busUpdatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Trip_code_key`(`code`),
    INDEX `Trip_date_idx`(`date`),
    UNIQUE INDEX `Trip_routeId_date_kind_key`(`routeId`, `date`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripStudent` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ARRIVED', 'PICKED_UP', 'ABSENT', 'DROPPED_OFF') NOT NULL DEFAULT 'PENDING',
    `arrivedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `note` VARCHAR(191) NOT NULL DEFAULT '',
    `handoverPending` BOOLEAN NOT NULL DEFAULT false,
    `handoverConfirmedAt` DATETIME(3) NULL,
    `handoverIssue` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TripStudent_studentId_idx`(`studentId`),
    UNIQUE INDEX `TripStudent_tripId_studentId_key`(`tripId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripEvent` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `action` ENUM('START_TRIP', 'ARRIVED_AT_STOP', 'PICKED_UP', 'MARKED_ABSENT', 'ARRIVED_AT_SCHOOL', 'START_RETURN', 'DROPPED_OFF', 'END_TRIP', 'EMERGENCY', 'REORDER_STOPS') NOT NULL,
    `studentCode` VARCHAR(191) NULL,
    `at` DATETIME(3) NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `detail` TEXT NULL,
    `driverId` VARCHAR(191) NULL,
    `schemaVersion` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TripEvent_tripId_at_idx`(`tripId`, `at`),
    INDEX `TripEvent_action_at_idx`(`action`, `at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationPing` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `speed` DOUBLE NULL,
    `heading` DOUBLE NULL,
    `at` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LocationPing_tripId_at_idx`(`tripId`, `at`),
    INDEX `LocationPing_at_idx`(`at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Absence` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `day` DATE NOT NULL,
    `scope` ENUM('FULL_DAY', 'MORNING_ONLY', 'RETURN_ONLY') NOT NULL,
    `reason` ENUM('NONE', 'SICK', 'FAMILY', 'TRAVEL', 'APPOINTMENT', 'OTHER') NOT NULL DEFAULT 'NONE',
    `note` VARCHAR(500) NOT NULL DEFAULT '',
    `guardianId` VARCHAR(191) NULL,
    `seenByDriverAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Absence_day_idx`(`day`),
    UNIQUE INDEX `Absence_studentId_day_key`(`studentId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Handover` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `confirmed` BOOLEAN NOT NULL,
    `issueReported` BOOLEAN NOT NULL DEFAULT false,
    `at` DATETIME(3) NOT NULL,
    `guardianId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Handover_tripId_idx`(`tripId`),
    INDEX `Handover_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `kind` ENUM('TRIP_REMINDER', 'TRIP_STARTED', 'DRIVER_NEAR', 'PICKED_UP', 'ARRIVED_SCHOOL', 'RETURN_STARTED', 'DELIVERED', 'PAYMENT', 'DELAY', 'ADMIN', 'ROUTE_CHANGE', 'EMERGENCY') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `studentCode` VARCHAR(191) NULL,
    `tripCode` VARCHAR(191) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Notification_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `periodTitle` VARCHAR(191) NOT NULL,
    `monthlyFee` INTEGER NOT NULL,
    `yearlyFee` INTEGER NULL,
    `dueAmount` INTEGER NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Subscription_studentId_active_idx`(`studentId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `paidAt` DATETIME(3) NOT NULL,
    `method` ENUM('CASH', 'CARD', 'ZAIN_CASH', 'BANK_TRANSFER') NOT NULL,
    `note` VARCHAR(191) NOT NULL DEFAULT '',
    `recordedById` VARCHAR(191) NULL,
    `recordedByName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Payment_code_key`(`code`),
    INDEX `Payment_studentId_paidAt_idx`(`studentId`, `paidAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportTicket` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `kind` ENUM('COMPLAINT', 'FEEDBACK') NOT NULL,
    `topic` ENUM('DRIVER', 'TIMING', 'VEHICLE', 'PAYMENT', 'APP', 'OTHER') NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('OPEN', 'IN_REVIEW', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `adminReply` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupportTicket_code_key`(`code`),
    INDEX `SupportTicket_userId_idx`(`userId`),
    INDEX `SupportTicket_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceToken` ADD CONSTRAINT `DeviceToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DriverProfile` ADD CONSTRAINT `DriverProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Route` ADD CONSTRAINT `Route_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Route` ADD CONSTRAINT `Route_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `Route`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_guardianId_fkey` FOREIGN KEY (`guardianId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RouteStop` ADD CONSTRAINT `RouteStop_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `Route`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RouteStop` ADD CONSTRAINT `RouteStop_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip` ADD CONSTRAINT `Trip_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `Route`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripStudent` ADD CONSTRAINT `TripStudent_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripStudent` ADD CONSTRAINT `TripStudent_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripEvent` ADD CONSTRAINT `TripEvent_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationPing` ADD CONSTRAINT `LocationPing_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Absence` ADD CONSTRAINT `Absence_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Handover` ADD CONSTRAINT `Handover_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Handover` ADD CONSTRAINT `Handover_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
