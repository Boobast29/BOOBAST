import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Recherche technique globale : code defaut, message erreur, modele, valise, solution
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ articles: [], tickets: [], stats: null });

  const [articles, tickets] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where: {
        OR: [
          { errorCode: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { symptoms: { contains: q, mode: "insensitive" } },
          { solution: { contains: q, mode: "insensitive" } },
          { vehicleModel: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 30,
    }),
    prisma.ticket.findMany({
      where: {
        OR: [
          { description: { contains: q, mode: "insensitive" } },
          { vehicleModel: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 30,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Stats agregees : nombre de cas, temps moyen
  const resTimes = articles.map((a) => a.resolutionMinutes).filter((n): n is number => !!n);
  const avg = resTimes.length ? Math.round(resTimes.reduce((a, b) => a + b, 0) / resTimes.length) : null;
  const causes = articles.map((a) => a.cause).filter(Boolean).slice(0, 5);

  return NextResponse.json({
    articles,
    tickets,
    stats: { count: articles.length + tickets.length, avgMinutes: avg, causes },
  });
}
