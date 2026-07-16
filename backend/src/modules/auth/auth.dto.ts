import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "admin@ftjj.tn" })
  @IsEmail({}, { message: "L'adresse email n'est pas valide" })
  email: string;

  @ApiProperty({ example: "Admin123!" })
  @IsString({ message: "Le mot de passe doit être une chaîne de caractères" })
  @MinLength(6, {
    message: "Le mot de passe doit contenir au moins 6 caractères",
  })
  password: string;
}

export class RegisterClubOwnerDto {
  @ApiProperty({ example: "club@exemple.tn" })
  @IsEmail({}, { message: "L'adresse email n'est pas valide" })
  email: string;

  @ApiProperty({ example: "MotDePasse123!" })
  @IsString()
  @MinLength(8, {
    message: "Le mot de passe doit contenir au moins 8 caractères",
  })
  password: string;

  @ApiProperty({ example: "Club Elite Tunis" })
  @IsString({ message: "Le nom du club est obligatoire" })
  @MinLength(2, {
    message: "Le nom du club doit contenir au moins 2 caractères",
  })
  clubName: string;

  @ApiProperty({ example: "123 Avenue Habib Bourguiba, Tunis" })
  @IsOptional()
  @IsString()
  clubAddress?: string;

  @ApiProperty({ example: "12345678" })
  @IsString({ message: "Le numéro CIN est obligatoire" })
  cin: string;

  @ApiProperty({ example: "Ahmed" })
  @IsString({ message: "Le prénom est obligatoire" })
  firstName: string;

  @ApiProperty({ example: "Ben Salah" })
  @IsString({ message: "Le nom de famille est obligatoire" })
  lastName: string;

  @ApiProperty({ required: false, description: "Documents uploadés (URLs)" })
  @IsOptional()
  documents?: Record<string, string>;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ApproveRejectRegistrationDto {
  @ApiProperty({ example: "Documents incomplets", required: false })
  @IsOptional()
  @IsString()
  adminComment?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
