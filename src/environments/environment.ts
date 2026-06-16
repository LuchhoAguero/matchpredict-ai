/**
 * ARCHIVO: environment.ts  (PRODUCCIÓN)
 * ─────────────────────────────────────────────────────────────────────────────
 * Este archivo SE COMMITEA a GitHub — no contiene datos sensibles.
 * Tiene valores vacíos o de placeholder para que el código compile en producción.
 *
 * En producción real, las keys se inyectan via variables de entorno del servidor
 * (ej: Railway, Vercel, etc.) — nunca se hardcodean aquí.
 *
 * CÓMO FUNCIONA EL SISTEMA DE ENTORNOS EN ANGULAR:
 * ──────────────────────────────────────────────────
 * Durante "ng serve" (desarrollo):
 *   Angular lee angular.json → ve "fileReplacements" → REEMPLAZA
 *   este archivo (environment.ts) con environment.development.ts
 *   → tu código ve las keys reales sin que estén en el repo.
 *
 * Durante "ng build" (producción):
 *   Angular usa ESTE archivo tal cual → sin keys → seguro.
 *
 * El truco: en el código siempre importamos desde "environment.ts",
 * pero Angular hace el swap automáticamente según el entorno.
 */
export const environment = {
  production: true,

  // En producción, estas values vendrían de variables de entorno del servidor
  apiFootballKey: '',
  apiFootballHost: 'v3.football.api-sports.io',
  apiFootballUrl: 'https://v3.football.api-sports.io',
};
