import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPrograms from "./tools/list-programs";
import listMyEnrollments from "./tools/list-my-enrollments";
import listNeonatalPatients from "./tools/list-neonatal-patients";
import getNeonatalPatient from "./tools/get-neonatal-patient";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "kotaro-academy",
  title: "KOTARO ACADEMY",
  version: "0.1.0",
  instructions:
    "Herramientas de KOTAMED / KOTARO ACADEMY. Consulta el catálogo académico, las matrículas del usuario y el censo y expedientes del módulo de Hospitalización Neonatal. Todas las lecturas respetan los permisos del usuario autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPrograms, listMyEnrollments, listNeonatalPatients, getNeonatalPatient],
});
