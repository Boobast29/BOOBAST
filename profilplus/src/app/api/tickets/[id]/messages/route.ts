import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const schema = z.object({
  body: z.string().min(1),
  attachments: z
    .array(z.object({ url: z.string(), filename: z.string(), type: z.string(), mimeType: z.string().optional(), size: z.number().optional() }))
    .optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const messages = await prisma.message.findMany({
    where: { ticketId: params.id },
    include: { author: true, attachments: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const message = await prisma.message.create({
    data: {
      ticketId: params.id,
      authorId: user.id,
      body: parsed.data.body,
      attachments: parsed.data.attachments?.length
        ? {
            create: parsed.data.attachments.map((a) => ({
              url: a.url, filename: a.filename, type: a.type as any, mimeType: a.mimeType, size: a.size,
            })),
          }
        : undefined,
    },
    include: { author: true, attachments: true },
  });
  await prisma.ticket.update({ where: { id: params.id }, data: { updatedAt: new Date() } });
  return NextResponse.json(message, { status: 201 });
}
