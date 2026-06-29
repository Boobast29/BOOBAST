import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("profilplus", 10);

  // Garages
  const quimper = await prisma.garage.upsert({
    where: { id: "garage-quimper" },
    update: {},
    create: { id: "garage-quimper", name: "Profil+ Quimper", city: "Quimper", region: "Bretagne", autonomyScore: 78, level: "AVANCE" },
  });
  const lyon = await prisma.garage.upsert({
    where: { id: "garage-lyon" },
    update: {},
    create: { id: "garage-lyon", name: "Profil+ Lyon Est", city: "Lyon", region: "Auvergne-Rhône-Alpes", autonomyScore: 55, level: "CONFIRME" },
  });

  // Parc materiel
  await prisma.equipment.createMany({
    data: [
      { garageId: quimper.id, brand: "TEXA", model: "Axone Nemo", version: "76.5.1", serialNumber: "TX-001923", license: "Car+Truck" },
      { garageId: quimper.id, brand: "AUTEL", model: "MaxiSys Ultra", version: "1.42", serialNumber: "AU-558210", license: "ADAS" },
      { garageId: lyon.id, brand: "BOSCH", model: "KTS 590", version: "2024.2", serialNumber: "BO-771029", license: "ESI[tronic]" },
    ],
    skipDuplicates: true,
  });

  // Utilisateurs
  await prisma.user.upsert({
    where: { email: "admin@profilplus.fr" },
    update: {},
    create: { email: "admin@profilplus.fr", name: "Admin Réseau", role: "ADMIN", passwordHash },
  });
  await prisma.user.upsert({
    where: { email: "tech@profilplus.fr" },
    update: {},
    create: { email: "tech@profilplus.fr", name: "Technicien Support", role: "TECHNICIEN", passwordHash },
  });
  const garageUser = await prisma.user.upsert({
    where: { email: "garage@profilplus.fr" },
    update: {},
    create: { email: "garage@profilplus.fr", name: "Garage Quimper", role: "GARAGE", passwordHash, garageId: quimper.id },
  });

  // Tickets de demo
  const t1 = await prisma.ticket.upsert({
    where: { reference: "PP-2026-0001" },
    update: {},
    create: {
      reference: "PP-2026-0001", status: "EN_COURS", urgence: "NORMALE",
      garageName: "Profil+ Quimper", userName: "Garage Quimper", phone: "06 12 34 56 78",
      toolBrand: "TEXA", vehicleBrand: "Renault", vehicleModel: "Clio V", vehicleYear: "2021", plate: "AB-123-CD",
      immobilized: false, description: "Impossible d'établir la communication avec le calculateur moteur. Code P2002 affiché après mise à jour de la valise.",
      aiSummary: "Renault Clio V — perte de communication calculateur moteur (P2002) après mise à jour TEXA.",
      creatorId: garageUser.id, garageId: quimper.id,
    },
  });

  await prisma.ticket.upsert({
    where: { reference: "PP-2026-0002" },
    update: {},
    create: {
      reference: "PP-2026-0002", status: "CRITIQUE", urgence: "CRITIQUE",
      garageName: "Profil+ Lyon Est", userName: "Atelier Lyon", phone: "06 98 76 54 32",
      toolBrand: "BOSCH", vehicleBrand: "Peugeot", vehicleModel: "308", vehicleYear: "2020",
      immobilized: true, description: "Véhicule immobilisé. Calibrage ADAS caméra avant impossible, la procédure se bloque à 80%.",
      creatorId: garageUser.id, garageId: lyon.id,
    },
  });

  // Base de pannes nationale
  await prisma.knowledgeArticle.create({
    data: {
      type: "CAS_CONNU", title: "Renault Clio V — P2002 après MAJ TEXA",
      toolBrand: "TEXA", vehicleBrand: "Renault", vehicleModel: "Clio V", errorCode: "P2002",
      symptoms: "Perte de communication calculateur après mise à jour logicielle.",
      cause: "Version VCI incompatible avec le dernier firmware.",
      solution: "Réinstaller la version VCI 76.4, relancer la communication, puis remettre à jour progressivement.",
      resolutionMinutes: 35, views: 142, sourceTicketId: t1.id,
    },
  });

  // Alerte nationale
  await prisma.nationalAlert.create({
    data: { title: "Problème de mise à jour TEXA", description: "12 garages signalent un échec de mise à jour TEXA sur la version 76.5.", toolBrand: "TEXA", count: 12 },
  });

  console.log("Seed terminé ✅");
}

main().finally(() => prisma.$disconnect());
