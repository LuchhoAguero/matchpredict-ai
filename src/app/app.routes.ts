/**
 * ARCHIVO: app.routes.ts
 * PROPÓSITO: Define las rutas (URLs) de la aplicación.
 *
 * NUEVA ESTRUCTURA — Una sola página:
 * ────────────────────────────────────────────────────────────────────────
 * Antes teníamos dos rutas separadas:
 *   /home      → HeroComponent (solo la portada)
 *   /dashboard → DashboardComponent (solo los partidos)
 *
 * Ahora tenemos UNA sola ruta:
 *   /  →  HomePageComponent (Hero + Dashboard en la misma página)
 *
 * ¿Por qué es mejor para este proyecto?
 *   - El usuario entra, ve la portada y scrollea para ver los partidos
 *   - No necesita hacer click en un botón para "ir" al dashboard
 *   - Es la experiencia típica de una landing page moderna
 * ────────────────────────────────────────────────────────────────────────
 */
import { Routes } from '@angular/router';

export const routes: Routes = [
  /**
   * Ruta principal: la página de inicio completa (Hero + Dashboard).
   *
   * Usamos lazy loading con loadComponent() para que el bundle inicial
   * sea pequeño — Angular carga HomePageComponent solo cuando se necesita.
   */
  {
    path: '',
    loadComponent: () =>
      import('./pages/home-page/home-page').then((c) => c.HomePageComponent),
  },

  /**
   * Wildcard: cualquier URL inválida redirige a la página principal.
   * Ejemplo: si alguien escribe /algo-que-no-existe → va a /
   */
  {
    path: '**',
    redirectTo: '',
  },
];
