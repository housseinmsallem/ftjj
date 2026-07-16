-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLUB_OWNER');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('ATHLETE', 'COACH', 'REFEREE', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "IdentityDocumentType" AS ENUM ('CIN', 'BIRTH_CERTIFICATE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LicenseCategory" AS ENUM ('LICENSE', 'STAGE', 'PASSAGE_GRADE', 'COMPETITION');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UPCOMING', 'LIVE', 'FINISHED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLUB_OWNER',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_documents" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'document',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Tunisienne',
    "gender" "Gender" NOT NULL,
    "photoUrl" TEXT,
    "identityDocumentType" "IdentityDocumentType" NOT NULL,
    "identityDocumentUrl" TEXT NOT NULL,
    "type" "PersonType" NOT NULL,
    "clubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "grade" TEXT,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "blackBeltAttestationUrl" TEXT,
    "coachingAttestationUrl" TEXT,
    "contractUrl" TEXT,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referees" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "refereeDegreeAttestationUrl" TEXT,

    CONSTRAINT "referees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "specialization" TEXT,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "pricingId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paymentReceiptUrl" TEXT,
    "validatedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "personId" TEXT,
    "licenseId" TEXT,
    "licenseType" TEXT NOT NULL,
    "paymentReceiptUrl" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "category" "LicenseCategory" NOT NULL,

    CONSTRAINT "pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_signups" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "PersonType" NOT NULL,
    "paymentReceiptUrl" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_signups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "redCornerId" TEXT NOT NULL,
    "blueCornerId" TEXT NOT NULL,
    "redScore" INTEGER NOT NULL DEFAULT 0,
    "blueScore" INTEGER NOT NULL DEFAULT 0,
    "warningsRed" INTEGER NOT NULL DEFAULT 0,
    "penaltiesRed" INTEGER NOT NULL DEFAULT 0,
    "warningsBlue" INTEGER NOT NULL DEFAULT 0,
    "penaltiesBlue" INTEGER NOT NULL DEFAULT 0,
    "status" "MatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "matNumber" INTEGER NOT NULL DEFAULT 1,
    "winMethod" TEXT,
    "winnerSide" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_ownerId_key" ON "clubs"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_personId_key" ON "athletes"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "coaches_personId_key" ON "coaches"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "referees_personId_key" ON "referees"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_personId_key" ON "technicians"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_licenseId_key" ON "registration_requests"("licenseId");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_name_key" ON "pricing"("name");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_documents" ADD CONSTRAINT "club_documents_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referees" ADD CONSTRAINT "referees_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "pricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_signups" ADD CONSTRAINT "competition_signups_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_signups" ADD CONSTRAINT "competition_signups_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_redCornerId_fkey" FOREIGN KEY ("redCornerId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_blueCornerId_fkey" FOREIGN KEY ("blueCornerId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
