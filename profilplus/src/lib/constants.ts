// PROFIL+ - constantes metier

export const TOOL_BRANDS = [
  "TEXA",
  "BOSCH",
  "JALTEST",
  "LAUNCH",
  "AUTEL",
  "DELPHI",
  "ACTIA",
  "AUTRE",
] as const;

export const VEHICLE_BRANDS = [
  "Renault",
  "Peugeot",
  "Citroën",
  "Volkswagen",
  "Mercedes",
  "BMW",
  "Ford",
  "Audi",
  "Opel",
  "Fiat",
  "Toyota",
  "Autre",
] as const;

export const STATUS_META: Record<
  string,
  { label: string; emoji: string; color: string; bg: string }
> = {
  CRITIQUE: { label: "Critique", emoji: "🔴", color: "#dc2626", bg: "bg-red-50 dark:bg-red-950/30" },
  PRIORITAIRE: { label: "Prioritaire", emoji: "🟠", color: "#ea580c", bg: "bg-orange-50 dark:bg-orange-950/30" },
  EN_COURS: { label: "En cours", emoji: "🟡", color: "#ca8a04", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  RESOLU: { label: "Résolu", emoji: "🟢", color: "#16a34a", bg: "bg-green-50 dark:bg-green-950/30" },
};

export const LEVEL_META: Record<
  string,
  { label: string; emoji: string; min: number }
> = {
  DEBUTANT: { label: "Débutant", emoji: "🔴", min: 0 },
  INTERMEDIAIRE: { label: "Intermédiaire", emoji: "🟠", min: 30 },
  CONFIRME: { label: "Confirmé", emoji: "🟡", min: 50 },
  AVANCE: { label: "Avancé", emoji: "🟢", min: 70 },
  EXPERT: { label: "Expert", emoji: "🏆", min: 90 },
};

export const KNOWLEDGE_TYPE_META: Record<string, { label: string; emoji: string }> = {
  CAS_CONNU: { label: "Cas connu", emoji: "✅" },
  ASTUCE: { label: "Astuce", emoji: "💡" },
  SOLUTION: { label: "Solution", emoji: "🛠️" },
  PROCEDURE: { label: "Procédure", emoji: "📋" },
  FICHE_TECHNIQUE: { label: "Fiche technique", emoji: "📄" },
};

// Questions intelligentes (jamais plus de 5)
export const SMART_QUESTIONS = [
  {
    id: "origine",
    label: "Le véhicule est-il d'origine ?",
    type: "boolean" as const,
  },
  {
    id: "accessoires",
    label: "Des accessoires sont-ils présents ?",
    type: "multi" as const,
    options: ["Attelage", "Géolocalisation", "Alarme", "Boîtier éthanol", "Dashcam", "Aménagement utilitaire", "Aucun"],
  },
  {
    id: "intervention",
    label: "Une intervention récente a-t-elle été effectuée ?",
    type: "multi" as const,
    options: ["Batterie", "Calculateur", "Faisceau", "Réparation électrique", "Mise à jour", "Aucune"],
  },
  {
    id: "perimetre",
    label: "Le problème concerne :",
    type: "single" as const,
    options: ["Un véhicule", "Plusieurs véhicules", "Tous les véhicules"],
  },
];
