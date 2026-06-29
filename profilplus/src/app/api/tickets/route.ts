import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { summarizeTicket } from "@/lib/ai";
import { ticketScoreDelta, clampScore, levelFromScore } from "@/lib/scoring";

const schema = z.object({
  garageName: z.string().min(1),
  userName: z.string().min(1),
  phone: z.string().min(1),
  toolBrand: z.enum(["TEXA", "BOSCH", "JALTEST", "LAUNCH", "AUTEL", "DELPHI", "ACTIA", "AUTRE"]),
  vehicleBrand: z.string().min(1),
  vehicleModel: z.string().min(1),
  vehicleYear: z.string().optional(),
  plate: z.string().optional(),
  immobilized: z.boolean().default(false),
  description: z.string().min(1),
  smartAnswers: z.any().optional(),
  attachments: z
    .array(z.object({ url: z.string(), filename: z.string(), type: z.string(), mimeType: z.string().optional(), size: z.number().optional() }))
    .optional(),
});

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const where = user.role === "GARAGE" ? { creatorId: user.id } : {};
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attachments: true, messages: true } } },
  });
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const count = await prisma.ticket.count();
  const reference = `PP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const urgence = d.immobilized ? "HAUTE" : "NORMALE";
  const status = d.immobilized ? "PRIORITAIRE" : "EN_COURS";

  const aiSummary = await summarizeTicket(d).catch(() => null);

  const ticket = await prisma.ticket.create({
    data: {
      reference,
      garageName: d.garageName,
      userName: d.userName,
      phone: d.phone,
      toolBrand: d.toolBrand,
      vehicleBrand: d.vehicleBrand,
      vehicleModel: d.vehicleModel,
      vehicleYear: d.vehicleYear,
      plate: d.plate,
      immobilized: d.immobilized,
      description: d.description,
      smartAnswers: d.smartAnswers ?? undefined,
      aiSummary: aiSummary ?? undefined,
      urgence: urgence as any,
      status: status as any,
      creatorId: user.id,
      garageId: user.garageId ?? undefined,
      attachments: d.attachments?.length
        ? {
            create: d.attachments.map((a) => ({
              url: a.url,
              filename: a.filename,
              type: a.type as any,
              mimeType: a.mimeType,
              size: a.size,
            })),
          }
        : undefined,
    },
  });

  // Scoring - Indice d'Autonomie
  if (user.garageId) {
    const garage = await prisma.garage.findUnique({ where: { id: user.garageId } });
    if (garage) {
      const delta = ticketScoreDelta({
        hasPhotos: !!d.attachments?.length,
        descriptionLength: d.description.length,
        fieldsCompleted: [d.vehicleYear, d.plate, d.smartAnswers].filter(Boolean).length / 3,
        responsiveness: 0.5,
      });
      const newScore = clampScore(garage.autonomyScore + delta);
      await prisma.garage.update({
        where: { id: garage.id },
        data: { autonomyScore: newScore, level: levelFromScore(newScore) },
      });
    }
  }

  await prisma.auditLog.create({
    data: { userId: user.id, action: "TICKET_CREATE", entity: "Ticket", entityId: ticket.id },
  });

  return NextResponse.json(ticket, { status: 201 });
}
