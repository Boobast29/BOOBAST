import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? undefined;
  const tool = sp.get("tool") ?? undefined;
  const brand = sp.get("brand") ?? undefined;

  const articles = await prisma.knowledgeArticle.findMany({
    where: {
      AND: [
        tool ? { toolBrand: tool as any } : {},
        brand ? { vehicleBrand: brand } : {},
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { errorCode: { contains: q, mode: "insensitive" } },
                { solution: { contains: q, mode: "insensitive" } },
                { symptoms: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json(articles);
}

const schema = z.object({
  type: z.enum(["CAS_CONNU", "ASTUCE", "SOLUTION", "PROCEDURE", "FICHE_TECHNIQUE"]),
  title: z.string().min(1),
  toolBrand: z.string().optional(),
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  symptoms: z.string().optional(),
  errorCode: z.string().optional(),
  cause: z.string().optional(),
  solution: z.string().min(1),
  procedure: z.string().optional(),
  resolutionMinutes: z.number().optional(),
  sourceTicketId: z.string().optional(),
});

// Transformer un ticket resolu en cas connu / fiche -> memoire technique nationale
export async function POST(req: NextRequest) {
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

  const article = await prisma.knowledgeArticle.create({
    data: { ...parsed.data, toolBrand: parsed.data.toolBrand as any, authorId: user.id },
  });
  return NextResponse.json(article, { status: 201 });
}
