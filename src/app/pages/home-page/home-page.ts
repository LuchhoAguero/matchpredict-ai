/**
 * COMPONENTE: HomePageComponent
 * ARCHIVO: home-page.ts
 * SELECTOR: <app-home-page>
 *
 * Este es un componente de tipo "PAGE" — no es un componente reutilizable,
 * sino el contenedor de una vista completa.
 *
 * CONCEPTO — ¿Por qué creamos este archivo en vez de poner todo en app.html?
 * ─────────────────────────────────────────────────────────────────────────
 * En Angular, separamos los componentes según su responsabilidad:
 *
 *   - Componentes de UI     → cosas reutilizables (match-card, filter-bar)
 *   - Componentes de Página → ensamblan una vista completa (home-page)
 *   - Componente Raíz       → el shell con header + router-outlet (app.ts)
 *
 * Este componente simplemente COMBINA hero + dashboard en una sola página.
 * No tiene lógica propia — delega todo a sus hijos.
 *
 * ESTRUCTURA VISUAL:
 * ┌────────────────────────────────────────┐
 * │         <app-hero>                     │ ← pantalla completa (100vh)
 * │   "ANTICIPA EL PARTIDO"                │
 * │   [Botón → hace scroll hacia abajo]    │
 * └────────────────────────────────────────┘
 * ┌────────────────────────────────────────┐
 * │         <app-dashboard>                │ ← empieza aquí al scrollear
 * │   [Filtros + grilla de tarjetas]       │
 * └────────────────────────────────────────┘
 */
import { Component } from '@angular/core';
import { HeroComponent } from '../../components/hero/hero';
import { DashboardComponent } from '../../components/dashboard/dashboard';

@Component({
  selector: 'app-home-page',
  standalone: true,
  // Importamos los dos componentes hijos que componen esta página
  imports: [HeroComponent, DashboardComponent],
  templateUrl: './home-page.html',
})
export class HomePageComponent {
  // Sin lógica propia — todo está en los componentes hijos.
}
