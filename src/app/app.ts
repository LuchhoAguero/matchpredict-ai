/**
 * COMPONENTE RAÍZ: App
 * ARCHIVO: app.ts
 *
 * Este es el componente "envoltorio" de toda la aplicación.
 * Su template (app.html) solo contiene:
 *   1. <app-header> — la barra de navegación siempre visible
 *   2. <router-outlet> — el "hueco" donde Angular pone el componente activo según la ruta
 *
 * Analogía: app.ts es como el "marco de una ventana".
 * El Header siempre está visible, y el <router-outlet> es la ventana
 * donde cambia la vista según la URL.
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header';

@Component({
  selector: 'app-root',
  standalone: true,
  // Importamos RouterOutlet (para el <router-outlet>) y HeaderComponent
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
