import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
})
export class HeaderComponent {

  isUserMenuOpen = false;
  isMobileMenuOpen = false;

  // event.stopPropagation() evita que el click burbujee al documento y cierre el menú al instante
  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  // Cierra el dropdown cuando el usuario hace click fuera de él
  @HostListener('document:click')
  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }
}
