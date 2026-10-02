// Couche IA - resume, detection de cas similaires, suggestions.
// Utilise l'API Claude si ANTHROPIC_API_KEY est defini, sinon mode heuristique local.
import { prisma } from "./prisma";

const MODEL = "claude-opus-4-8";

async function callClaude(system: string, user: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

// Resume automatique d'un ticket
export async function summarizeTicket(ticket: {
  vehicleBrand: string;
  vehicleModel: string;
  toolBrand: string;
  description: string;
}): Promise<string> {
  const ai = await callClaude(
    "Tu es un expert du diagnostic automobile. Resume en 2 phrases claires le probleme remonte par un garage Profil+.",
    `Valise: ${ticket.toolBrand}\nVehicule: ${ticket.vehicleBrand} ${ticket.vehicleModel}\nProbleme: ${ticket.description}`,
  );
  if (ai) return ai.trim();
  // Fallback heuristique
  const short = ticket.description.slice(0, 160);
  return `${ticket.vehicleBrand} ${ticket.vehicleModel} - valise ${ticket.toolBrand}. ${short}${ticket.description.length > 160 ? "…" : ""}`;
}

// Detection de cas similaires dans la base de connaissances
export async function findSimilarCases(query: {
  vehicleBrand?: string;
  toolBrand?: string;
  text: string;
}) {
  const codeMatch = query.text.match(/\b[PpBbCcUu]\d{4}\b/);
  const errorCode = codeMatch ? codeMatch[0].toUpperCase() : undefined;

  return prisma.knowledgeArticle.findMany({
    where: {
      OR: [
        errorCode ? { errorCode } : {},
        query.vehicleBrand ? { vehicleBrand: query.vehicleBrand } : {},
        { title: { contains: query.text.slice(0, 40), mode: "insensitive" } },
      ],
    },
    take: 5,
    orderBy: { views: "desc" },
  });
}

// Suggestions de solutions (texte)
export async function suggestSolution(description: string): Promise<string> {
  const ai = await callClaude(
    "Tu es un technicien support diagnostic Profil+. Propose 3 pistes de resolution concretes et numerotees.",
    description,
  );
  if (ai) return ai.trim();
  return "1. Vérifier la version du logiciel de la valise et les mises à jour.\n2. Contrôler la communication véhicule (OBD, alimentation, faisceau).\n3. Rechercher le code défaut dans la base de pannes nationale.";
}
