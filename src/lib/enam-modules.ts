/**
 * ENAM area modules — five independent learning ecosystems living inside
 * the Residentado program. Each area gets its own dashboard shell with
 * an 11-section navigation. Structure only, no academic content baked in.
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Baby,
  HeartPulse,
  Scissors,
  ShieldPlus,
  BookOpen,
  Route as RouteIcon,
  Layers,
  Stethoscope,
  ListChecks,
  Sparkles,
  BrainCircuit,
  Library,
  LineChart,
  Settings,
  Presentation,
} from "lucide-react";

export type EnamAreaSlug =
  | "medicina-interna"
  | "ciencias-quirurgicas"
  | "ginecologia-obstetricia"
  | "pediatria-neonatologia"
  | "salud-publica";

export interface EnamAreaMeta {
  slug: EnamAreaSlug;
  title: string;
  short: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  accent: string; // css color-mix source
  gradient: string; // tailwind gradient utility
}

export const ENAM_AREAS: EnamAreaMeta[] = [
  {
    slug: "medicina-interna",
    title: "Medicina Interna",
    short: "MI",
    tagline: "Razonamiento clínico integral del adulto.",
    description:
      "Módulo dedicado al dominio de las patologías médicas del adulto, con foco en abordaje sistémico, medicina basada en evidencia y alto rendimiento para ENAM.",
    icon: Stethoscope,
    accent: "oklch(0.62 0.11 185)",
    gradient: "from-teal-500/20 via-cyan-500/10 to-transparent",
  },
  {
    slug: "ciencias-quirurgicas",
    title: "Ciencias Quirúrgicas",
    short: "CQ",
    tagline: "Cirugía, trauma y manejo perioperatorio.",
    description:
      "Módulo enfocado en cirugía general, trauma, urgencias quirúrgicas y subespecialidades, con algoritmos de decisión y perlas del examen.",
    icon: Scissors,
    accent: "oklch(0.65 0.15 25)",
    gradient: "from-rose-500/20 via-orange-500/10 to-transparent",
  },
  {
    slug: "ginecologia-obstetricia",
    title: "Ginecología & Obstetricia",
    short: "GO",
    tagline: "Salud de la mujer y periodo perinatal.",
    description:
      "Módulo integral de ginecología, obstetricia y salud reproductiva, con énfasis en emergencias obstétricas y guías vigentes.",
    icon: HeartPulse,
    accent: "oklch(0.66 0.16 340)",
    gradient: "from-pink-500/20 via-fuchsia-500/10 to-transparent",
  },
  {
    slug: "pediatria-neonatologia",
    title: "Pediatría & Neonatología",
    short: "PN",
    tagline: "Del recién nacido al adolescente.",
    description:
      "Módulo dedicado al paciente pediátrico y neonatal, con crecimiento, desarrollo, urgencias y patologías de alto rendimiento.",
    icon: Baby,
    accent: "oklch(0.68 0.13 260)",
    gradient: "from-indigo-500/20 via-violet-500/10 to-transparent",
  },
  {
    slug: "salud-publica",
    title: "Salud Pública",
    short: "SP",
    tagline: "Epidemiología, prevención y sistema de salud.",
    description:
      "Módulo transversal de salud pública, epidemiología, bioestadística y organización sanitaria en el contexto peruano y latinoamericano.",
    icon: ShieldPlus,
    accent: "oklch(0.68 0.14 145)",
    gradient: "from-emerald-500/20 via-green-500/10 to-transparent",
  },
];

export function getEnamArea(slug: string): EnamAreaMeta | undefined {
  return ENAM_AREAS.find((a) => a.slug === slug);
}

export type ModuleSectionId =
  | "presentacion"
  | "ruta"
  | "contenido"
  | "casos"
  | "banco"
  | "flashcards"
  | "simuladores"
  | "biblioteca"
  | "tutor-ia"
  | "progreso"
  | "configuracion";

export interface ModuleSection {
  id: ModuleSectionId;
  label: string;
  icon: LucideIcon;
  hint: string;
}

export const MODULE_SECTIONS: ModuleSection[] = [
  { id: "presentacion", label: "Presentación", icon: Presentation, hint: "Landing del módulo" },
  { id: "ruta", label: "Ruta Académica", icon: RouteIcon, hint: "Roadmap por niveles" },
  { id: "contenido", label: "Contenido", icon: Layers, hint: "Temas y clases" },
  { id: "casos", label: "Casos Clínicos", icon: Stethoscope, hint: "Casos interactivos" },
  { id: "banco", label: "Banco de Preguntas", icon: ListChecks, hint: "Q-Bank con explicación" },
  { id: "flashcards", label: "Flashcards", icon: Sparkles, hint: "Repetición espaciada" },
  { id: "simuladores", label: "Simuladores", icon: Activity, hint: "Simulacros cronometrados" },
  { id: "biblioteca", label: "Biblioteca", icon: Library, hint: "Guías, libros y artículos" },
  { id: "tutor-ia", label: "Tutor IA", icon: BrainCircuit, hint: "Asistente citando evidencia" },
  { id: "progreso", label: "Mi Progreso", icon: LineChart, hint: "Métricas de aprendizaje" },
  { id: "configuracion", label: "Configuración", icon: Settings, hint: "Preferencias del módulo" },
];

/** Default learning path stages (roadmap). Persisted per-area in metadata. */
export const DEFAULT_ROUTE_STAGES = [
  "Introducción",
  "Fundamentos",
  "Nivel Básico",
  "Nivel Intermedio",
  "Nivel Avanzado",
  "Casos Clínicos",
  "Banco de Preguntas",
  "Simulador",
  "Dominio",
];

export interface AreaLandingMeta {
  coverUrl?: string;
  videoUrl?: string;
  objectives?: string[];
  competencies?: string[];
  totalHours?: number;
  professor?: string;
  updatedLabel?: string;
  level?: string;
  routeStages?: string[];
}

export const LANDING_ICON = BookOpen;
