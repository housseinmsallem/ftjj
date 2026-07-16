import { Module } from "@nestjs/common";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ClubsModule } from "./modules/clubs/clubs.module";
import { PersonsModule } from "./modules/persons/persons.module";
import { LicensesModule } from "./modules/licenses/licenses.module";
import { RegistrationsModule } from "./modules/registrations/registrations.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { CompetitionsModule } from "./modules/competitions/competitions.module";
import { MatchesModule } from "./modules/matches/matches.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { EmailModule } from "./modules/email/email.module";
import { PublicModule } from "./modules/public/public.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ScoringModule } from "./modules/scoring/scoring.module";
import { CmsModule } from "./modules/cms/cms.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ClubsModule,
    PersonsModule,
    LicensesModule,
    RegistrationsModule,
    PricingModule,
    CompetitionsModule,
    MatchesModule,
    ScoringModule,
    UploadsModule,
    EmailModule,
    PublicModule,
    DashboardModule,
    CmsModule,
  ],
})
export class AppModule {}
