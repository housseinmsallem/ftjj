import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { FrenchValidationPipe } from "./common/pipes/french-validation.pipe";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global prefix
  app.setGlobalPrefix("api");

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Static files for uploads — resolve relative to project root (works in both dev and prod)
  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads/",
  });

  // Global pipes with French messages
  app.useGlobalPipes(new FrenchValidationPipe());

  // Global exception filter for French error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle("FTJJ API")
    .setDescription("API de gestion de la Fédération Tunisienne de Jiu-Jitsu")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 Backend démarré sur http://localhost:${port}`);
  console.log(`📚 Documentation Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
