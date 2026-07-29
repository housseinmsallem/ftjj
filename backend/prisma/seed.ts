import {
  PrismaClient,
  Role,
  LicenseCategory,
  PersonType,
  Gender,
  IdentityDocumentType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Simple display ID generator (matching backend utility)
function generateDisplayId(uuid: string, attempt = 0): string {
  const hex = uuid.replace(/-/g, "");
  const offsets = [12, 0, 4, 8, 16, 20];
  const offset = offsets[attempt % offsets.length];
  const slice = hex.slice(offset, offset + 12).padEnd(12, "0");
  let num = BigInt("0x" + slice);
  if (num === 0n) num = BigInt("0x" + hex.slice(0, 12));
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  while (num > 0n) {
    result = chars[Number(num % 36n)] + result;
    num = num / 36n;
  }
  return result.padStart(8, "0").slice(0, 8) || "00000000";
}

async function assignDisplayIds() {
  const persons = await prisma.person.findMany({ where: { displayId: null }, select: { id: true } });
  for (const p of persons) {
    let displayId: string;
    let attempt = 0;
    do {
      displayId = generateDisplayId(p.id, attempt);
      const exists = await prisma.person.findUnique({ where: { displayId }, select: { id: true } });
      if (!exists) break;
      attempt++;
    } while (attempt < 10);
    await prisma.person.update({ where: { id: p.id }, data: { displayId } });
  }
  if (persons.length > 0) console.log(`✅ ${persons.length} displayIds attribués`);
}

// ==========================================
// Seeded photos helper
// ==========================================
const PHOTOS_DIR = path.join(process.cwd(), "uploads", "photos");
const availablePhotos: string[] = [];

function loadPhotos(): void {
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.warn("⚠️  Dossier photos introuvable:", PHOTOS_DIR);
    return;
  }
  const files = fs.readdirSync(PHOTOS_DIR);
  for (const file of files) {
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(file)) {
      availablePhotos.push(`/uploads/photos/${file}`);
    }
  }
  console.log(`📸 ${availablePhotos.length} photos trouvées dans uploads/photos/`);
}

function randomPhoto(): string | undefined {
  if (availablePhotos.length === 0) return undefined;
  return availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
}

// ==========================================
// Clean the entire database before seeding
// ==========================================
async function cleanDatabase() {
  console.log("🧹 Nettoyage de la base de données...\n");

  // Delete in dependency order (children first, then parents)
  await prisma.featuredMedia.deleteMany();
  await prisma.match.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.mat.deleteMany();
  await prisma.competitionSignup.deleteMany();
  await prisma.competitionDocument.deleteMany();
  await prisma.registrationRequest.deleteMany();
  await prisma.license.deleteMany();
  await prisma.athlete.deleteMany();
  await prisma.coach.deleteMany();
  await prisma.referee.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.person.deleteMany();
  await prisma.clubDocument.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.club.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pricing.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.season.deleteMany();
  await prisma.article.deleteMany();
  await prisma.document.deleteMany();

  console.log("✅ Base de données nettoyée avec succès.\n");
}

async function main() {
  console.log("🌱 Démarrage du seeding...\n");

  // Clean first
  await cleanDatabase();

  // Load available photos
  loadPhotos();

  // ==========================================
  // 1. Create default admin user
  // ==========================================
  const adminEmail = "admin@example.com";
  const adminPassword = await bcrypt.hash("Admin123!", 12);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        username: "admin",
        password: adminPassword,
        role: Role.ADMIN,
        isApproved: true,
      },
    });
    console.log(
      `✅ Administrateur créé: ${adminEmail} (mot de passe: Admin123!)`,
    );
  } else {
    console.log(`ℹ️  Administrateur existe déjà: ${adminEmail}`);
  }

  // ==========================================
  // 2. Create all pricing items
  // ==========================================
  const pricingItems = [
    {
      name: "Inscription Annuelle",
      amount: 120.0,
      category: LicenseCategory.LICENSE,
    },
    {
      name: "License Coach",
      amount: 40.0,
      category: LicenseCategory.LICENSE,
    },
    {
      name: "License Technicien",
      amount: 20.0,
      category: LicenseCategory.LICENSE,
    },
    {
      name: "License Athlete (Homme)",
      amount: 15.0,
      category: LicenseCategory.LICENSE,
    },
    {
      name: "License Athlete (Femme)",
      amount: 5.0,
      category: LicenseCategory.LICENSE,
    },
    {
      name: "Stage passage de grade",
      amount: 10.0,
      category: LicenseCategory.STAGE,
    },
    {
      name: "Recyclage coach et arbitres",
      amount: 10.0,
      category: LicenseCategory.STAGE,
    },
    {
      name: "Passage de Grade — Marron",
      amount: 50.0,
      category: LicenseCategory.PASSAGE_GRADE,
    },
    {
      name: "Passage de Grade — Black Belt et +",
      amount: 100.0,
      category: LicenseCategory.PASSAGE_GRADE,
    },
    {
      name: "Passage de Grade Arbitre — 1er degré",
      amount: 100.0,
      category: LicenseCategory.PASSAGE_GRADE,
    },
    {
      name: "Passage de Grade Arbitre — 2ème degré",
      amount: 120.0,
      category: LicenseCategory.PASSAGE_GRADE,
    },
    {
      name: "Passage de Grade Arbitre — 3ème degré",
      amount: 150.0,
      category: LicenseCategory.PASSAGE_GRADE,
    },
    {
      name: "Coach fédéral",
      amount: 400.0,
      category: LicenseCategory.LICENSE,
    },
    {
      name: "Participation Compétition",
      amount: 10.0,
      category: LicenseCategory.COMPETITION,
    },
    {
      name: "Participation Qualifications",
      amount: 10.0,
      category: LicenseCategory.COMPETITION,
    },
    {
      name: "Participation Jeux Finals",
      amount: 10.0,
      category: LicenseCategory.COMPETITION,
    },
    {
      name: "Assurance Compétition (Homme)",
      amount: 15.0,
      category: LicenseCategory.COMPETITION,
    },
    {
      name: "Assurance Compétition (Femme)",
      amount: 5.0,
      category: LicenseCategory.COMPETITION,
    },
  ];

  let createdCount = 0;
  for (const item of pricingItems) {
    const existing = await prisma.pricing.findUnique({
      where: { name: item.name },
    });
    if (!existing) {
      await prisma.pricing.create({ data: item });
      createdCount++;
    }
  }
  console.log(
    `✅ ${createdCount} nouveaux tarifs créés (${pricingItems.length - createdCount} existants)`,
  );

  // ==========================================
  // 2b. Seed default season
  // ==========================================
  const existingSeason = await prisma.season.findFirst({ where: { isCurrent: true } });
  if (!existingSeason) {
    await prisma.season.create({
      data: {
        name: "2026/2027",
        isCurrent: true,
        startsAt: new Date("2026-09-01"),
        endsAt: new Date("2027-08-31"),
        registrationClosesAt: new Date("2027-06-30"),
      },
    });
    console.log("✅ Saison 2026/2027 créée et activée");
  }

  // ==========================================
  // 3. Optional: Create sample club and persons
  // ==========================================
  const existingClubs = await prisma.club.count();
  if (existingClubs === 0) {
    const samplePassword = await bcrypt.hash("Club123!", 12);

    const clubOwner = await prisma.user.create({
      data: {
        email: "club@example.com",
        username: "club",
        password: samplePassword,
        role: Role.CLUB_OWNER,
        isApproved: true,
        club: {
          create: {
            name: "Club Sportif Elite",
            address: "15 Avenue de la Liberté, Tunis",
          },
        },
      },
      include: { club: true },
    });

    console.log(`✅ Club Owner créé: ${clubOwner.email} / Club123!`);
    console.log(`   Club: ${clubOwner.club?.name}`);

    if (clubOwner.club) {
      // Create sample athletes
      await prisma.person.create({
        data: {
          firstName: "Karim",
          lastName: "Mejri",
          dateOfBirth: new Date("1998-03-15"),
          nationality: "Tunisienne",
          gender: Gender.MALE,
          photoUrl: randomPhoto(),
          identityDocumentType: IdentityDocumentType.CIN,
          identityDocumentUrl: "/uploads/documents/cin-placeholder.pdf",
          type: PersonType.ATHLETE,
          clubId: clubOwner.club.id,
          athleteDetails: {
            create: { grade: "Ceinture Bleue" },
          },
        },
      });

      await prisma.person.create({
        data: {
          firstName: "Sami",
          lastName: "Trabelsi",
          dateOfBirth: new Date("2008-07-22"),
          nationality: "Tunisienne",
          gender: Gender.MALE,
          photoUrl: randomPhoto(),
          identityDocumentType: IdentityDocumentType.BIRTH_CERTIFICATE,
          identityDocumentUrl: "/uploads/documents/birth-cert-placeholder.pdf",
          type: PersonType.ATHLETE,
          clubId: clubOwner.club.id,
          athleteDetails: {
            create: { grade: "Ceinture Bleue" },
          },
        },
      });

      await prisma.person.create({
        data: {
          firstName: "Hichem",
          lastName: "Ben Othman",
          dateOfBirth: new Date("1985-11-03"),
          nationality: "Tunisienne",
          gender: Gender.MALE,
          photoUrl: randomPhoto(),
          identityDocumentType: IdentityDocumentType.CIN,
          identityDocumentUrl: "/uploads/documents/cin-placeholder.pdf",
          type: PersonType.COACH,
          clubId: clubOwner.club.id,
          coachDetails: {
            create: {
              blackBeltAttestationUrl:
                "/uploads/documents/black-belt-placeholder.pdf",
              coachingAttestationUrl:
                "/uploads/documents/coaching-placeholder.pdf",
            },
          },
        },
      });

      console.log("✅ Personnes créées: 2 athlètes, 1 coach");
    }

    // Create a pending club owner registration
    await prisma.user.create({
      data: {
        email: "nouveau.club@example.com",
        username: "nouveauclub",
        password: samplePassword,
        role: Role.CLUB_OWNER,
        isApproved: false,
        club: {
          create: {
            name: "Club Sportif Nabeul",
            address: "Rue de la Corniche, Nabeul",
          },
        },
      },
    });
    console.log(
      "✅ Club en attente d'approbation créé: nouveau.club@example.com",
    );

    // Create a sample competition
    const competition = await prisma.competition.create({
      data: {
        name: "Championnat National 2025",
        date: new Date("2025-09-15"),
        location: "Salle Omnisports, Tunis",
        description: "Championnat national de Jiu-Jitsu toutes catégories",
      },
    });
    console.log("✅ Compétition créée: Championnat National 2025");
  }

  // ==========================================
  // 4. Competition test data (always run)
  // ==========================================
  const existingComp = await prisma.competition.findFirst({ where: { name: "Open National Jiu-Jitsu 2026" } });
  if (!existingComp) {
    // Find or use existing club
    let club = await prisma.club.findFirst();
    if (!club) {
      const pw = await bcrypt.hash("Club123!", 12);
      const owner = await prisma.user.create({
        data: { email: "testclub@example.com", username: "testclub", password: pw, role: Role.CLUB_OWNER, isApproved: true,
          club: { create: { name: "Club Test Competition", address: "Tunis" } } },
        include: { club: true },
      });
      club = owner.club!;
    }

    // Create competitions: one IBJJF (split by belt), one Newaza (no split)
    const comp1 = await prisma.competition.create({
      data: { name: "Open National Jiu-Jitsu 2026", date: new Date("2026-07-20"), location: "Salle Omnisports, Tunis",
        description: "Open national avec séparation par ceintures", type: "Open", splitByBelt: true },
    });
    const comp2 = await prisma.competition.create({
      data: { name: "Tournoi Newaza 2026", date: new Date("2026-08-10"), location: "Hammamet",
        description: "Tournoi Newaza toutes ceintures confondues", type: "Open", splitByBelt: false },
    });

    // Athletes with different weights and belts for realistic bracket testing
    const athletes = [
      // Men -77kg category
      { firstName: "Karim", lastName: "Mejri", dob: "1998-03-15", gender: Gender.MALE, grade: "BLUE", weight: 73 },
      { firstName: "Sami", lastName: "Trabelsi", dob: "2000-07-22", gender: Gender.MALE, grade: "BLUE", weight: 75 },
      { firstName: "Amine", lastName: "Jlassi", dob: "1999-11-10", gender: Gender.MALE, grade: "BLUE", weight: 70 },
      { firstName: "Yassine", lastName: "Ghazouani", dob: "1997-05-05", gender: Gender.MALE, grade: "PURPLE", weight: 77 },
      { firstName: "Walid", lastName: "Chaouachi", dob: "1996-09-18", gender: Gender.MALE, grade: "PURPLE", weight: 74 },
      { firstName: "Hichem", lastName: "Ben Othman", dob: "1985-11-03", gender: Gender.MALE, grade: "BROWN", weight: 76 },
      { firstName: "Nader", lastName: "Toumi", dob: "1990-02-14", gender: Gender.MALE, grade: "BROWN", weight: 72 },
      { firstName: "Fares", lastName: "Zitouni", dob: "1992-08-30", gender: Gender.MALE, grade: "BLACK_1", weight: 75 },
      // Men -85kg
      { firstName: "Mahmoud", lastName: "Dridi", dob: "1995-04-20", gender: Gender.MALE, grade: "BLUE", weight: 82 },
      { firstName: "Oussama", lastName: "Gharbi", dob: "1998-12-01", gender: Gender.MALE, grade: "BLUE", weight: 84 },
      { firstName: "Tarek", lastName: "Sassi", dob: "1993-06-15", gender: Gender.MALE, grade: "PURPLE", weight: 80 },
      { firstName: "Rami", lastName: "Bouazizi", dob: "1994-03-22", gender: Gender.MALE, grade: "PURPLE", weight: 85 },
      // Women -55kg
      { firstName: "Rania", lastName: "Mansouri", dob: "2000-01-10", gender: Gender.FEMALE, grade: "WHITE", weight: 52 },
      { firstName: "Monia", lastName: "Jebali", dob: "2001-06-08", gender: Gender.FEMALE, grade: "WHITE", weight: 54 },
      { firstName: "Sonia", lastName: "Haddad", dob: "1999-09-25", gender: Gender.FEMALE, grade: "BLUE", weight: 50 },
      { firstName: "Ines", lastName: "Cherif", dob: "1998-11-17", gender: Gender.FEMALE, grade: "BLUE", weight: 55 },
    ];

    const createdAthletes: any[] = [];
    for (const a of athletes) {
      const person = await prisma.person.create({
        data: {
          firstName: a.firstName, lastName: a.lastName, dateOfBirth: new Date(a.dob),
          nationality: "Tunisienne", gender: a.gender,
          photoUrl: randomPhoto(),
          identityDocumentType: IdentityDocumentType.CIN, identityDocumentUrl: "/uploads/documents/cin-placeholder.pdf",
          type: PersonType.ATHLETE, clubId: club.id,
          athleteDetails: { create: { grade: a.grade, weight: a.weight } },
        },
      });
      createdAthletes.push(person);
    }

    // Sign up athletes to comp1 (IBJJF — all of them)
    for (const a of createdAthletes) {
      await prisma.competitionSignup.create({
        data: { competitionId: comp1.id, personId: a.id, type: PersonType.ATHLETE, status: "APPROVED" },
      });
    }

    // Sign up first 10 to comp2 (Newaza)
    for (const a of createdAthletes.slice(0, 10)) {
      await prisma.competitionSignup.create({
        data: { competitionId: comp2.id, personId: a.id, type: PersonType.ATHLETE, status: "APPROVED" },
      });
    }

    console.log(`✅ Compétitions de test créées: "${comp1.name}" (IBJJF, ${createdAthletes.length} inscrits), "${comp2.name}" (Newaza, 10 inscrits)`);
    console.log(`✅ ${createdAthletes.length} athlètes créés avec poids et grades variés`);
  } else {
    console.log("ℹ️  Compétitions de test existent déjà");
  }

  // ==========================================
  // 5. Assign athlete codes to persons without one
  // ==========================================
  const uncoded = await prisma.person.findMany({
    where: { code: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (uncoded.length > 0) {
    // Find highest existing code number
    const lastCoded = await prisma.person.findFirst({
      where: { code: { startsWith: "ATHTJJF" } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    let nextNum = 3094;
    if (lastCoded?.code) {
      const numPart = lastCoded.code.slice(7);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    for (const p of uncoded) {
      await prisma.person.update({
        where: { id: p.id },
        data: { code: `ATHTJJF${nextNum++}` },
      });
    }
    console.log(`✅ ${uncoded.length} codes d'athlète attribués (ATHTJJF${nextNum - uncoded.length} → ATHTJJF${nextNum - 1})`);
  }

  // ==========================================
  // 6. Assign short display IDs to persons without one
  // ==========================================
  await assignDisplayIds();

  console.log("\n🎉 Seeding terminé avec succès !");
  console.log("================================");
  console.log("Comptes de test:");
  console.log("  Admin:    admin@example.com / Admin123!");
  console.log("  Club:     club@example.com / Club123!");
  console.log("  En attente: nouveau.club@example.com / Club123!");
  console.log("================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Erreur durant le seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
