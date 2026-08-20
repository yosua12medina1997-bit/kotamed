/**
 * Blueprint del croquis físico del pabellón de Hospitalización Pediátrica
 * HNSEB. Las coordenadas son porcentajes del lienzo (0–100) tomados
 * directamente de los croquis originales del Pabellón A y B, de modo que la
 * reconstrucción digital conserve proporciones, orientación y posición real de
 * cada sala, pasadizo y cama.
 */

export type CroquisBlockKind =
  | "room"
  | "service"
  | "corridor"
  | "corridor-v"
  | "entrance-left"
  | "entrance-right"
  | "title";

export interface CroquisBed {
  /** Número real de la cama; `null` = espacio de cama sin numeración. */
  number: string | null;
  /** Centro de la cama en % del lienzo. */
  x: number;
  y: number;
}

export interface CroquisBlock {
  id: string;
  kind: CroquisBlockKind;
  label: string;
  /** Etiqueta de la zona equivalente en base de datos (para vincular camas). */
  zoneLabel?: string;
  /** Rótulo interior de la sala (p. ej. IM LEYLA). */
  tag?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vertical?: boolean;
  beds?: CroquisBed[];
}

export interface CroquisPavilion {
  code: string;
  title: string;
  /** Relación de aspecto del croquis original. */
  ratio: number;
  blocks: CroquisBlock[];
}

/* ─────────────────────────────── Pabellón A ─────────────────────────────── */

const PAVILION_A: CroquisPavilion = {
  code: "A",
  title: "Croquis del Pabellón A",
  ratio: 800 / 460,
  blocks: [
    {
      id: "a-nutricion",
      kind: "service",
      label: "NUTRICIÓN",
      zoneLabel: "NUTRICIÓN",
      x: 10.5,
      y: 11,
      w: 24,
      h: 25,
    },
    {
      id: "a-leyla-sup",
      kind: "room",
      label: "SALA IM LEYLA (SUPERIOR)",
      zoneLabel: "SALA IM LEYLA · SUPERIOR",
      tag: "IM LEYLA",
      x: 37,
      y: 11,
      w: 25,
      h: 25,
      beds: [
        { number: "8", x: 41, y: 17.5 },
        { number: "33", x: 58, y: 17.5 },
        { number: "15", x: 41, y: 31 },
      ],
    },
    {
      id: "a-sshh",
      kind: "service",
      label: "SSHH",
      zoneLabel: "SSHH",
      x: 63.5,
      y: 11,
      w: 14,
      h: 25,
    },
    {
      id: "a-pasadizo-star",
      kind: "corridor-v",
      label: "PASADIZO AL STAR MÉDICO Y JEFATURA →",
      zoneLabel: "PASADIZO AL STAR MÉDICO Y JEFATURA",
      vertical: true,
      x: 79,
      y: 11,
      w: 9,
      h: 42,
    },
    {
      id: "a-star",
      kind: "service",
      label: "STAR ENFERMERÍA",
      zoneLabel: "STAR ENFERMERÍA",
      x: 89.5,
      y: 14,
      w: 10,
      h: 22,
    },
    {
      id: "a-entrada",
      kind: "entrance-left",
      label: "ENTRADA PRINCIPAL",
      zoneLabel: "ENTRADA PRINCIPAL",
      x: 0,
      y: 40,
      w: 14,
      h: 18,
    },
    {
      id: "a-pasadizo",
      kind: "corridor",
      label: "PASADIZO → → →",
      zoneLabel: "PASADIZO",
      x: 14.5,
      y: 43,
      w: 74,
      h: 12,
    },
    {
      id: "a-sala-inf-izq",
      kind: "room",
      label: "SALA INFERIOR IZQUIERDA",
      zoneLabel: "SALA INFERIOR IZQUIERDA",
      x: 10.5,
      y: 60,
      w: 24,
      h: 27,
      beds: [
        { number: null, x: 14.5, y: 66 },
        { number: null, x: 30.5, y: 66 },
        { number: null, x: 14.5, y: 81 },
        { number: null, x: 30.5, y: 81 },
      ],
    },
    {
      id: "a-leyla-inf",
      kind: "room",
      label: "SALA IM LEYLA (INFERIOR)",
      zoneLabel: "SALA IM LEYLA · INFERIOR",
      tag: "IM LEYLA",
      x: 37,
      y: 60,
      w: 25,
      h: 27,
      beds: [
        { number: null, x: 41, y: 66 },
        { number: null, x: 58, y: 66 },
        { number: "3", x: 41, y: 81 },
        { number: null, x: 58, y: 81 },
      ],
    },
    {
      id: "a-damaris",
      kind: "room",
      label: "SALA IM DAMARIS",
      zoneLabel: "SALA IM DAMARIS",
      tag: "IM DAMARIS",
      x: 64.5,
      y: 60,
      w: 25,
      h: 27,
      beds: [
        { number: "19", x: 68.5, y: 66 },
        { number: "20", x: 85.5, y: 66 },
        { number: "1", x: 68.5, y: 81 },
        { number: "14", x: 85.5, y: 81 },
      ],
    },
  ],
};

/* ─────────────────────────────── Pabellón B ─────────────────────────────── */

const PAVILION_B: CroquisPavilion = {
  code: "B",
  title: "Croquis del Pabellón B",
  ratio: 800 / 460,
  blocks: [
    {
      id: "b-star",
      kind: "service",
      label: "STAR ENFERMERÍA",
      zoneLabel: "STAR ENFERMERÍA",
      x: 1,
      y: 13,
      w: 8.5,
      h: 24,
    },
    {
      id: "b-sshh",
      kind: "service",
      label: "SSHH",
      zoneLabel: "SSHH",
      x: 11,
      y: 11,
      w: 24,
      h: 26,
    },
    {
      id: "b-kelly",
      kind: "room",
      label: "SALA IM KELLY",
      zoneLabel: "SALA IM KELLY",
      tag: "IM KELLY",
      x: 37,
      y: 11,
      w: 25,
      h: 26,
      beds: [
        { number: "2", x: 41, y: 17.5 },
        { number: "9", x: 58, y: 17.5 },
        { number: "22", x: 41, y: 31.5 },
      ],
    },
    {
      id: "b-sala-sup-der",
      kind: "room",
      label: "SALA SUPERIOR DERECHA",
      zoneLabel: "SALA SUPERIOR DERECHA",
      x: 64,
      y: 11,
      w: 27,
      h: 26,
      beds: [
        { number: null, x: 68, y: 17.5 },
        { number: null, x: 87, y: 17.5 },
        { number: null, x: 68, y: 31.5 },
        { number: null, x: 87, y: 31.5 },
      ],
    },
    {
      id: "b-pasadizo",
      kind: "corridor",
      label: "PASADIZO → → →",
      zoneLabel: "PASADIZO",
      x: 0.5,
      y: 43,
      w: 81,
      h: 12,
    },
    {
      id: "b-entrada",
      kind: "entrance-right",
      label: "ENTRADA AUDITORIO",
      zoneLabel: "ENTRADA AUDITORIO",
      x: 82,
      y: 40,
      w: 17.5,
      h: 18,
    },
    {
      id: "b-verlin",
      kind: "room",
      label: "SALA IM VERLIN",
      zoneLabel: "SALA IM VERLIN",
      tag: "IM VERLIN",
      x: 10,
      y: 60,
      w: 25,
      h: 27,
      beds: [
        { number: "31", x: 31, y: 66 },
        { number: "23", x: 14, y: 81 },
        { number: "21", x: 31, y: 81 },
      ],
    },
    {
      id: "b-ailen",
      kind: "room",
      label: "SALA IM AILEN",
      zoneLabel: "SALA IM AILEN",
      tag: "IM AILEN",
      x: 37,
      y: 60,
      w: 25,
      h: 27,
      beds: [
        { number: null, x: 41, y: 66 },
        { number: "32", x: 58, y: 66 },
        { number: null, x: 41, y: 81 },
        { number: "36", x: 58, y: 81 },
      ],
    },
    {
      id: "b-sala-inf-der",
      kind: "room",
      label: "SALA INFERIOR DERECHA",
      zoneLabel: "SALA INFERIOR DERECHA",
      x: 64,
      y: 60,
      w: 27,
      h: 27,
      beds: [
        { number: null, x: 68, y: 66 },
        { number: null, x: 87, y: 66 },
        { number: null, x: 68, y: 81 },
        { number: null, x: 87, y: 81 },
      ],
    },
  ],
};

export const CROQUIS: CroquisPavilion[] = [PAVILION_A, PAVILION_B];

export function croquisFor(code: string | null | undefined): CroquisPavilion {
  const c = (code ?? "A").trim().toUpperCase();
  return CROQUIS.find((p) => p.code === c) ?? PAVILION_A;
}

/* ───────────────────────── Semáforo clínico de camas ───────────────────── */

export type BedLevel = "libre" | "estable" | "seguimiento" | "prioritario" | "critico";

export const BED_LEVELS: {
  key: BedLevel;
  label: string;
  color: string;
  /** Estados de paciente que se representan con este nivel. */
  statuses: string[];
}[] = [
  { key: "libre", label: "Disponible", color: "#94a3b8", statuses: [] },
  { key: "estable", label: "Estable", color: "#22c55e", statuses: ["estable", "alta"] },
  {
    key: "seguimiento",
    label: "Seguimiento",
    color: "#eab308",
    statuses: ["seguimiento", "pendiente"],
  },
  { key: "prioritario", label: "Prioritario", color: "#f97316", statuses: ["prioritario"] },
  { key: "critico", label: "Crítico", color: "#ef4444", statuses: ["critico"] },
];

export function levelForStatus(status: string | null | undefined): BedLevel {
  if (!status) return "libre";
  const found = BED_LEVELS.find((l) => l.statuses.includes(status));
  return found?.key ?? "seguimiento";
}

export function levelColor(level: BedLevel): string {
  return BED_LEVELS.find((l) => l.key === level)?.color ?? "#94a3b8";
}

export function levelLabel(level: BedLevel): string {
  return BED_LEVELS.find((l) => l.key === level)?.label ?? "Disponible";
}
