// Indice d'Autonomie Profil+ (0 a 100)
import type { GarageLevel } from "@prisma/client";
import { LEVEL_META } from "./constants";

export interface ScoreInput {
  hasPhotos: boolean;
  descriptionLength: number;
  fieldsCompleted: number; // 0..1 ratio
  responsiveness: number; // 0..1 ratio (reponses aux messages)
  uselessTicket?: boolean;
}

// Calcule la contribution d'un ticket au score (delta applique)
export function ticketScoreDelta(input: ScoreInput): number {
  let delta = 0;
  if (input.hasPhotos) delta += 4; // photos ajoutees
  if (input.descriptionLength > 120) delta += 3; // description claire
  else if (input.descriptionLength < 20) delta -= 3; // info manquante
  delta += Math.round(input.fieldsCompleted * 3); // utilisation correcte
  delta += Math.round(input.responsiveness * 3); // reactivite
  if (input.uselessTicket) delta -= 6; // ticket inutile
  return Math.max(-10, Math.min(10, delta));
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function levelFromScore(score: number): GarageLevel {
  if (score >= LEVEL_META.EXPERT.min) return "EXPERT";
  if (score >= LEVEL_META.AVANCE.min) return "AVANCE";
  if (score >= LEVEL_META.CONFIRME.min) return "CONFIRME";
  if (score >= LEVEL_META.INTERMEDIAIRE.min) return "INTERMEDIAIRE";
  return "DEBUTANT";
}
