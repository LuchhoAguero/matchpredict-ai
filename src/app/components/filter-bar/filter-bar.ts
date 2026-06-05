/**
 * COMPONENTE: FilterBarComponent
 * ARCHIVO: filter-bar.ts
 * SELECTOR: <app-filter-bar>
 *
 * Barra de filtros superior del Dashboard. Permite al usuario:
 *   1. Buscar equipos por nombre
 *   2. Filtrar por competición (liga)
 *   3. Cambiar el tab de estado: Próximos / En Vivo / Finalizados
 *
 * PATRÓN "CONTROLLED COMPONENT" (componente controlado):
 * Este componente NO guarda el estado de los filtros.
 * El estado vive en el Dashboard (el padre).
 * El FilterBar solo:
 *   - RECIBE los valores actuales via @Input()
 *   - AVISA cuando el usuario los cambia via @Output()
 *
 * Esto permite que el Dashboard reaccione a los cambios y filtre los partidos.
 *
 * ¿Cómo se conectan en el template del Dashboard?
 *   <app-filter-bar
 *     [searchQuery]="searchQuery"              ← envía valor actual
 *     [competition]="competition"
 *     [status]="status"
 *     (searchChanged)="onSearch($event)"       ← recibe cambios del hijo
 *     (competitionChanged)="onCompetition($event)"
 *     (statusChanged)="onStatus($event)"
 *   />
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [],   // Sin imports adicionales — usamos HTML nativo + Tailwind
  templateUrl: './filter-bar.html',
})
export class FilterBarComponent {

  /** ─── @Input: Valores actuales de los filtros (vienen del Dashboard) ─── */

  /** Texto de búsqueda actual */
  @Input() searchQuery: string = '';

  /** Competición seleccionada ('all', 'premier-league', etc.) */
  @Input() competition: string = 'all';

  /** Tab activo: 'upcoming', 'live' o 'finished' */
  @Input() status: string = 'upcoming';

  /** ─── @Output: Eventos que emite cuando el usuario cambia algo ────────── */

  /** Emite el nuevo texto cuando el usuario escribe en el buscador */
  @Output() searchChanged = new EventEmitter<string>();

  /** Emite la nueva competición cuando el usuario cambia el select */
  @Output() competitionChanged = new EventEmitter<string>();

  /** Emite el nuevo tab cuando el usuario hace click en Próximos/En Vivo/Finalizados */
  @Output() statusChanged = new EventEmitter<string>();

  /**
   * Lista de competiciones para el <select> de filtro.
   * Es una constante de la clase (no cambia), definida directamente aquí
   * porque solo la usa este componente.
   */
  readonly competitions = [
    { value: 'all',               label: 'Todas las Competiciones' },
    { value: 'premier-league',    label: 'Premier League' },
    { value: 'la-liga',           label: 'La Liga' },
    { value: 'serie-a',           label: 'Serie A' },
    { value: 'bundesliga',        label: 'Bundesliga' },
    { value: 'ligue-1',           label: 'Ligue 1' },
    { value: 'liga-argentina',    label: 'Liga Argentina' },
    { value: 'champions-league',  label: 'Champions League' },
  ];

  /**
   * MANEJADORES DE EVENTOS DEL DOM
   *
   * Estos métodos reciben el Event nativo del navegador,
   * extraen el valor del elemento HTML, y lo emiten via @Output.
   *
   * ($event.target as HTMLInputElement) es un "type cast" en TypeScript:
   * le decimos al compilador que sabemos que target es un input de texto.
   */

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChanged.emit(value);
  }

  onCompetitionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.competitionChanged.emit(value);
  }
}
