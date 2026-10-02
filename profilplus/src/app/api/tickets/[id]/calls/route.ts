import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const schema = z.object({
  calledAt: z.string(),
  durationMinutes: z.number().optional(),
  report: z.string().min(1),
});

// Rappel garage - historise date/heure/duree/compte rendu
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!["TECHNICIEN", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const call = await prisma.callLog.create({
    data: {
      ticketId: params.id,
      agentId: user.id,
      calledAt: new Date(parsed.data.calledAt),
      durationMinutes: parsed.data.durationMinutes,
      report: parsed.data.report,
    },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "GARAGE_CALLED", entity: "Ticket", entityId: params.id },
  });
  return NextResponse.json(call, { status: 201 });
}
