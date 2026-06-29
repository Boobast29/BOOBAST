import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { clampScore, levelFromScore } from "@/lib/scoring";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      attachments: true,
      messages: { include: { author: true, attachments: true }, orderBy: { createdAt: "asc" } },
      callLogs: { include: { agent: true }, orderBy: { createdAt: "desc" } },
      creator: true,
      assignee: true,
      garage: true,
    },
  });
  if (!ticket) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(ticket);
}

// Mise a jour statut / assignation / resolution (technicien-admin)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!["TECHNICIEN", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json();
  const data: any = {};
  if (body.status) data.status = body.status;
  if (body.urgence) data.urgence = body.urgence;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;

  if (body.status === "RESOLU") {
    const t = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (t) {
      data.resolvedAt = new Date();
      data.resolutionMinutes = Math.round((Date.now() - t.createdAt.getTime()) / 60000);
      // bonus autonomie au garage
      if (t.garageId) {
        const g = await prisma.garage.findUnique({ where: { id: t.garageId } });
        if (g) {
          const s = clampScore(g.autonomyScore + 2);
          await prisma.garage.update({ where: { id: g.id }, data: { autonomyScore: s, level: levelFromScore(s) } });
        }
      }
    }
  }

  const ticket = await prisma.ticket.update({ where: { id: params.id }, data });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "TICKET_UPDATE", entity: "Ticket", entityId: ticket.id, meta: data },
  });
  return NextResponse.json(ticket);
}
