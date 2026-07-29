import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsUUID,
  ValidateIf,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PersonType, Gender, IdentityDocumentType } from "@prisma/client";

export class CreatePersonDto {
  @ApiProperty({ example: "Mohamed" })
  @IsString({ message: "Le prénom est obligatoire" })
  firstName: string;

  @ApiProperty({ example: "Ben Ali" })
  @IsString({ message: "Le nom de famille est obligatoire" })
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  arabicFirstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  arabicLastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transferAuthorizationUrl?: string;

  @ApiProperty({ example: "2000-05-15" })
  @IsDateString(
    {},
    { message: "La date de naissance doit être une date valide" },
  )
  dateOfBirth: string;

  @ApiProperty({ example: "Tunisienne", default: "Tunisienne" })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender, { message: "Le genre doit être MALE ou FEMALE" })
  gender: Gender;

  @ApiProperty({ enum: PersonType })
  @IsEnum(PersonType, { message: "Le type de personne est invalide" })
  type: PersonType;

  @ApiProperty({ enum: IdentityDocumentType })
  @IsEnum(IdentityDocumentType, {
    message: "Le type de document d'identité est invalide",
  })
  identityDocumentType: IdentityDocumentType;

  @ApiProperty({ required: false, example: "/uploads/documents/cin-123.pdf" })
  @IsOptional()
  @IsString()
  identityDocumentUrl?: string;

  @ApiProperty({
    required: false,
    example: "/uploads/documents/birth-cert-123.pdf",
  })
  @IsOptional()
  @IsString()
  birthCertificateUrl?: string;

  @ApiProperty({ required: false, example: "/uploads/documents/recu-123.pdf" })
  @IsOptional()
  @IsString()
  paymentReceiptUrl?: string;

  @ApiProperty({ required: false, example: "/uploads/photos/photo-123.jpg" })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ required: false, example: ["Champion National 2025"] })
  @IsOptional()
  @IsString({ each: true })
  achievements?: string[];

  @ApiProperty({
    description: "ID du club (optionnel pour les propriétaires de club)",
  })
  @IsOptional()
  @IsUUID("4", { message: "L'ID du club est invalide" })
  clubId?: string;

  // Athlete-specific
  @ApiProperty({ required: false, example: "Ceinture Bleue" })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({ required: false, example: 73 })
  @IsOptional()
  weight?: number;

  // Coach-specific
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  blackBeltAttestationUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coachingAttestationUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contractUrl?: string;

  // Referee-specific
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refereeDegreeAttestationUrl?: string;

  // Technician-specific
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialization?: string;
}

export class UpdatePersonDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  arabicFirstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  arabicLastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transferAuthorizationUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  identityDocumentUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  birthCertificateUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentReceiptUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  blackBeltAttestationUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coachingAttestationUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contractUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refereeDegreeAttestationUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ required: false, enum: PersonType })
  @IsOptional()
  @IsEnum(PersonType, { message: "Le type de personne est invalide" })
  type?: PersonType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString({}, { message: "La date de naissance doit être une date valide" })
  dateOfBirth?: string;

  @ApiProperty({ required: false, enum: Gender })
  @IsOptional()
  @IsEnum(Gender, { message: "Le genre doit être MALE ou FEMALE" })
  gender?: Gender;

  @ApiProperty({ required: false, enum: IdentityDocumentType })
  @IsOptional()
  @IsEnum(IdentityDocumentType, { message: "Le type de document d'identité est invalide" })
  identityDocumentType?: IdentityDocumentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID("4", { message: "L'ID du club est invalide" })
  clubId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ required: false, example: ["Champion National 2025"] })
  @IsOptional()
  @IsString({ each: true })
  achievements?: string[];
}

export class BatchCreatePersonDto {
  @ApiProperty({ type: [CreatePersonDto] })
  persons: CreatePersonDto[];

  @ApiProperty({
    required: false,
    description: "Reçu de paiement commun pour le lot",
  })
  @IsOptional()
  @IsString()
  commonPaymentReceiptUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID("4")
  commonPricingId?: string;
}
