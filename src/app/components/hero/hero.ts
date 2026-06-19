/**
 * COMPONENTE: HeroComponent
 * ARCHIVO: hero.ts
 * SELECTOR: <app-hero>
 *
 * Portada de la aplicación. Ocupa toda la pantalla inicial.
 *
 * CAMBIO RESPECTO A LA VERSIÓN ANTERIOR:
 * ────────────────────────────────────────────────────────────────────────
 * Antes: los botones navegaban a la ruta /dashboard con Router.navigate().
 * Ahora: los botones hacen SCROLL SUAVE hasta la sección #matches de la
 *         misma página — porque ahora todo está en una sola página unificada.
 *
 * Esta es la diferencia entre:
 *   - Navegación entre páginas → router.navigate(['/otra-ruta'])
 *   - Scroll dentro de la misma página → scrollIntoView() o scrollTo()
 *
 * Para una SPA de tipo "landing page", el scroll en la misma página
 * da una experiencia más fluida y moderna.
 * ────────────────────────────────────────────────────────────────────────
 */
import { Component } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.html',
})
export class HeroComponent {

  /**
   * Hace scroll suave hasta la sección de partidos (#matches).
   *
   * getElementById('matches') busca el elemento con id="matches" en el DOM.
   * scrollIntoView() lo desplaza hasta hacerlo visible.
   * { behavior: 'smooth' } activa la animación de scroll suave.
   *
   * Este id "matches" está definido en home-page.html:
   *   <section id="matches"> <app-dashboard /> </section>
   *
   * El "?" es optional chaining: si el elemento no existe (null),
   * no llama a scrollIntoView() y evita un error.
   */
  scrollToMatches(): void {
    document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Hace scroll suave hacia abajo (para el botón "Saber más").
   * Baja el 80% de la altura de la pantalla — llega justo al inicio
   * de la sección del dashboard.
   */
  scrollDown(): void {
    window.scrollTo({
      top: window.innerHeight * 0.8,
      behavior: 'smooth',
    });
  }
}
