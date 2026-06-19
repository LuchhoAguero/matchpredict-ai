/**
 * ARCHIVO: app.config.ts
 * PROPÓSITO: Configuración global de la aplicación Angular.
 *
 * ¿Qué son los "providers"?
 * ─────────────────────────────────────────────────────────────────────────────
 * En Angular, los "providers" son servicios o funcionalidades que se registran
 * a nivel global para que CUALQUIER componente o servicio de la app pueda usarlos.
 *
 * Es como registrar herramientas en una caja de herramientas central:
 * "Quiero que toda la app tenga acceso al Router, al HttpClient, etc."
 *
 * NUEVO: provideHttpClient()
 * ─────────────────────────────────────────────────────────────────────────────
 * HttpClient es el servicio de Angular para hacer peticiones HTTP (GET, POST...).
 * En Angular 21, se registra con provideHttpClient() — ya no se importa un módulo.
 *
 * withFetch() es una opción que le dice a Angular que use la Fetch API nativa
 * del navegador en lugar de XMLHttpRequest (más moderna y eficiente).
 */
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),

    /**
     * provideHttpClient() — Habilita el sistema de peticiones HTTP en toda la app.
     *
     * Sin esto, si intentás inyectar HttpClient en un servicio, Angular tira error:
     *   "NullInjectorError: No provider for HttpClient!"
     *
     * withFetch() — Usa la Fetch API del navegador (más moderna que XMLHttpRequest).
     * Es especialmente importante cuando usamos SSR (Server-Side Rendering),
     * que este proyecto tiene habilitado con Angular SSR.
     */
    provideHttpClient(withFetch()),
  ],
};
