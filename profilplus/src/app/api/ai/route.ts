import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { findSimilarCases, suggestSolution, summarizeTicket } from "@/lib/ai";

// IA : resume, cas similaires, suggestions, generation de procedures
export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { action, ticketId, text } = await req.json();

  if (action === "summary" && ticketId) {
    const t = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!t) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const summary = await summarizeTicket(t);
    await prisma.ticket.update({ where: { id: ticketId }, data: { aiSummary: summary } });
    return NextResponse.json({ summary });
  }

  if (action === "similar") {
    const t = ticketId ? await prisma.ticket.findUnique({ where: { id: ticketId } }) : null;
    const cases = await findSimilarCases({
      vehicleBrand: t?.vehicleBrand,
      toolBrand: t?.toolBrand,
      text: text ?? t?.description ?? "",
    });
    return NextResponse.json({ cases });
  }

  if (action === "suggest") {
    const t = ticketId ? await prisma.ticket.findUnique({ where: { id: ticketId } }) : null;
    const suggestion = await suggestSolution(text ?? t?.description ?? "");
    return NextResponse.json({ suggestion });
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
