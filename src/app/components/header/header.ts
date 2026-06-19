/**
 * COMPONENTE: HeaderComponent
 * ARCHIVO: header.ts
 * SELECTOR: <app-header>
 *
 * Este componente muestra la barra de navegación superior de la app.
 * Es "standalone" porque se declara a sí mismo, sin necesidad de un módulo.
 *
 * ¿QUÉ IMPORTAMOS Y POR QUÉ?
 * - CommonModule: incluye directivas básicas de Angular como NgClass, NgStyle.
 *                 Aunque en Angular 17+ muchas se pueden omitir, es una buena práctica
 *                 incluirlo en componentes que muestran/ocultan elementos.
 * - RouterLink:   Permite usar [routerLink]="/ruta" en el HTML para navegar
 *                 sin recargar la página (Single Page Application behavior).
 */
import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',       // Así se usa en otros templates: <app-header />
  standalone: true,              // Sin NgModule — patrón moderno de Angular
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
})
export class HeaderComponent {

  /**
   * ESTADO DEL COMPONENTE
   * En Angular, las propiedades de la clase son el "estado" del componente.
   * Cuando cambian, Angular actualiza el HTML automáticamente.
   */

  // Controla si el dropdown del usuario está abierto (true) o cerrado (false)
  isUserMenuOpen = false;

  // Controla si el menú móvil (hamburguesa) está desplegado
  isMobileMenuOpen = false;

  /**
   * MÉTODOS (funciones que reaccionan a eventos del usuario)
   */

  // Alterna el dropdown del usuario al hacer click en el avatar
  // event.stopPropagation() evita que el click "burbujee" al documento
  // (de lo contrario, el @HostListener lo cerraría inmediatamente)
  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  // Alterna el menú de navegación en pantallas pequeñas
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  /**
   * @HostListener('document:click')
   * Este decorador "escucha" cualquier click en todo el documento.
   * Lo usamos para cerrar el dropdown cuando el usuario hace click FUERA de él.
   * Es el equivalente Angular de window.addEventListener('click', ...).
   */
  @HostListener('document:click')
  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }
}
