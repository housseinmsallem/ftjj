import {
  ValidationPipe,
  ValidationError,
  BadRequestException,
} from '@nestjs/common';

const frenchMessages: Record<string, string> = {
  isString: 'doit être une chaîne de caractères',
  isEmail: "doit être une adresse email valide",
  isNotEmpty: 'ne doit pas être vide',
  minLength: 'doit contenir au moins $constraint1 caractères',
  maxLength: 'ne doit pas dépasser $constraint1 caractères',
  isEnum: 'doit être une valeur valide parmi: $constraint1',
  isDateString: 'doit être une date valide',
  isUUID: "doit être un identifiant UUID valide",
  isInt: 'doit être un nombre entier',
  isNumber: 'doit être un nombre',
  isBoolean: 'doit être un booléen',
  isArray: 'doit être un tableau',
  arrayMinSize: 'doit contenir au moins $constraint1 élément(s)',
  matches: 'ne respecte pas le format attendu',
  min: 'doit être supérieur ou égal à $constraint1',
  max: 'doit être inférieur ou égal à $constraint1',
  isOptional: '',
};

function translateConstraint(key: string): string {
  return frenchMessages[key] || `validation échouée: ${key}`;
}

function formatConstraintMessage(message: string, constraints: Record<string, any>): string {
  let formatted = message;
  if (constraints) {
    for (const [key, value] of Object.entries(constraints)) {
      formatted = formatted.replace(`$constraint1`, String(value));
    }
  }
  return formatted;
}

function flattenErrors(errors: ValidationError[], parentPath = ''): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const [rule, defaultMessage] of Object.entries(error.constraints)) {
        const translated = translateConstraint(rule);
        const msg = formatConstraintMessage(translated, (error as any).contexts?.[rule]);
        messages.push(`Le champ "${field}" ${msg}`);
      }
    }

    if (error.children && error.children.length > 0) {
      messages.push(...flattenErrors(error.children, field));
    }
  }

  return messages;
}

export class FrenchValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flattenErrors(errors);
        return new BadRequestException({
          statusCode: 400,
          message: 'Erreur de validation',
          errors: messages,
        });
      },
    });
  }
}
