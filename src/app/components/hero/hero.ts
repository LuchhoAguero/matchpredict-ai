/**
 * COMPONENTE: HeroComponent
 * ARCHIVO: hero.ts
 * SELECTOR: <app-hero>
 *
 * Este componente muestra la "portada" o landing page de la aplicación.
 * Ocupa toda la pantalla y tiene dos acciones principales:
 *   1. Ir al Dashboard (ruta /dashboard)
 *   2. Hacer scroll suave hacia abajo ("Saber más")
 *
 * IMPORTANTE — ¿Cómo difiere del original de Next.js?
 * El original recibía "onStartAnalysis" como una PROP (propiedad de React).
 * En Angular, la navegación se maneja directamente con el Router o routerLink.
 * Para esta app, usamos routerLink en el template y el Router en el .ts.
 *
 * IMPORTS:
 * - Router: el servicio de Angular para navegar entre rutas por código.
 * - RouterLink: para usar [routerLink]="/ruta" en el HTML directamente.
 */
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero',       // Uso: <app-hero /> en el template del padre
  standalone: true,
  imports: [],                // Sin imports de directivas (usamos Router programáticamente)
  templateUrl: './hero.html',
})
export class HeroComponent {

  /**
   * INYECCIÓN DE DEPENDENCIAS (versión simple)
   *
   * El constructor es el lugar donde Angular "inyecta" servicios en el componente.
   * Al declarar "private router: Router", Angular automáticamente nos da
   * una instancia del servicio Router para usar dentro de la clase.
   *
   * Piénsalo como: "Necesito el GPS (Router) para poder navegar entre páginas".
   */
  constructor(private router: Router) {}

  /**
   * Navega programáticamente al Dashboard.
   * Se llama cuando el usuario hace click en "Empezar Análisis".
   *
   * router.navigate() es equivalente a window.location.href = '/dashboard',
   * pero SIN recargar la página (es SPA behavior).
   */
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Hace scroll suave hacia abajo al hacer click en "Saber más".
   * window.scrollTo() es JavaScript nativo — funciona igual en Angular.
   */
  scrollDown(): void {
    window.scrollTo({
      top: window.innerHeight * 0.8,
      behavior: 'smooth',
    });
  }
}
