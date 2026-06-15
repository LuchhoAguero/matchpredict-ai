/**
 * ARCHIVO: environment.development.ts  (DESARROLLO LOCAL)
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  ESTE ARCHIVO ESTÁ EN .gitignore — NUNCA SE SUBE A GITHUB ⚠️
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Aquí van las credenciales reales que usás en tu máquina local.
 * Angular CLI reemplaza automáticamente environment.ts con ESTE archivo
 * cuando ejecutás "ng serve" (gracias a "fileReplacements" en angular.json).
 *
 * INSTRUCCIONES:
 * 1. Abrí tu cuenta en https://dashboard.api-sports.io/
 * 2. Copiá tu API Key
 * 3. Pegala en apiFootballKey abajo (reemplazá 'PEGA_TU_API_KEY_AQUI')
 * 4. Guardá el archivo
 *
 * Si otra persona clona el repo, NO tendrá este archivo.
 * Deberá crear el suyo con su propia key.
 * Podés documentar esto en el README.md del proyecto.
 */
export const environment = {
  production: false,

  // ↓↓↓ PEGÁ TU API KEY REAL DE api-sports.io ACÁ ↓↓↓
  apiFootballKey:  'PEGA_TU_API_KEY_AQUI',

  // El host que va en el header x-rapidapi-host
  apiFootballHost: 'v3.football.api-sports.io',

  // URL base para las peticiones HTTP
  apiFootballUrl:  'https://v3.football.api-sports.io',
};
