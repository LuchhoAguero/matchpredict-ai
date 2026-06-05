/**
 * ARCHIVO: app.routes.ts
 * PROPÓSITO: Define las rutas (URLs) de la aplicación.
 *
 * En Angular, cada ruta mapea un PATH de URL a un COMPONENTE.
 * Cuando el usuario visita esa URL, Angular renderiza el componente
 * correspondiente dentro del <router-outlet> del app.html.
 *
 * LAZY LOADING con loadComponent():
 * En vez de importar los componentes directamente (import estático),
 * usamos loadComponent() que carga el componente SOLO cuando se necesita.
 *
 * Ventaja: el bundle inicial de la app es más pequeño y carga más rápido.
 * Es como decir: "No traigas todo el libro, solo el capítulo que voy a leer ahora."
 */
import { Routes } from '@angular/router';

export const routes: Routes = [
  /**
   * Ruta raíz: redirige automáticamente a /home
   * Si el usuario visita matchpredict.ai/, lo manda a matchpredict.ai/home
   * pathMatch: 'full' significa que SOLO la URL exacta "/" dispara la redirección
   */
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  /**
   * Ruta /home → muestra el HeroComponent (la portada)
   *
   * loadComponent() recibe una función arrow que hace un import() dinámico.
   * La sintaxis .then(c => c.HeroComponent) indica QUÉ exportación del archivo
   * queremos usar (porque un archivo puede exportar múltiples cosas).
   */
  {
    path: 'home',
    loadComponent: () =>
      import('./components/hero/hero').then((c) => c.HeroComponent),
  },

  /**
   * Ruta /dashboard → muestra el DashboardComponent
   */
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard').then((c) => c.DashboardComponent),
  },

  /**
   * Wildcard: captura cualquier URL que no coincida con las rutas anteriores.
   * Redirige al home para evitar pantallas en blanco.
   */
  {
    path: '**',
    redirectTo: 'home',
  },
];
