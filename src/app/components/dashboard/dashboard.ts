/**
 * COMPONENTE: DashboardComponent
 * ARCHIVO: dashboard.ts
 * SELECTOR: <app-dashboard>
 *
 * Es el componente "inteligente" (smart/container component).
 * Contiene todo el ESTADO de la pantalla de dashboard y la lógica de filtrado.
 *
 * RESPONSABILIDADES:
 *   1. Guardar el estado de los filtros (searchQuery, competition, status)
 *   2. Calcular los partidos filtrados (filteredMatches)
 *   3. Controlar cuál tarjeta tiene el panel de IA abierto (openAnalysisId)
 *   4. Pasar datos a los hijos (FilterBar, MatchCard) via @Input
 *   5. Escuchar eventos de los hijos via @Output y actualizar el estado
 *
 * ÁRBOL DE COMPONENTES:
 *   app-dashboard
 *   ├── app-filter-bar  (recibe estado, emite cambios)
 *   └── app-match-card × N  (recibe cada partido + estado del panel IA)
 *       └── app-ai-analysis  (panel desplegable, recibe el partido)
 */
import { Component } from '@angular/core';
import { Match } from '../../models/match.model';
import { MOCK_MATCHES } from '../../data/mock-matches';
import { FilterBarComponent } from '../filter-bar/filter-bar';
import { MatchCardComponent } from '../match-card/match-card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  // Importamos los dos componentes hijos directos del template
  imports: [FilterBarComponent, MatchCardComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {

  /** ─── Estado de los Filtros ─────────────────────────────────────────── */

  /** Texto de búsqueda actual (sincronizado con el input del FilterBar) */
  searchQuery: string = '';

  /** Competición seleccionada. 'all' = mostrar todas */
  competition: string = 'all';

  /** Tab activo en el FilterBar */
  status: string = 'upcoming';

  /** ─── Estado del Panel de IA ──────────────────────────────────────────── */

  /**
   * ID del partido que tiene el panel de IA abierto.
   * null = ningún panel está abierto.
   *
   * Por diseño, solo puede haber UN panel abierto a la vez.
   */
  openAnalysisId: string | null = null;

  /** ─── Datos de Partidos ───────────────────────────────────────────────── */

  /**
   * Todos los partidos disponibles (del archivo mock-matches.ts).
   * Cuando conectemos la API real, este array se llenará con la respuesta HTTP.
   */
  allMatches: Match[] = MOCK_MATCHES;

  /**
   * Mapa para convertir los valores del select a nombres de liga reales.
   * Necesario porque el select usa 'premier-league' pero los datos usan 'Premier League'.
   */
  private readonly leagueMap: Record<string, string> = {
    'premier-league':   'Premier League',
    'la-liga':          'La Liga',
    'serie-a':          'Serie A',
    'bundesliga':       'Bundesliga',
    'ligue-1':          'Ligue 1',
    'liga-argentina':   'Liga Argentina',
    'champions-league': 'Champions League',
  };

  /**
   * GETTER: filteredMatches
   *
   * Esta es la lógica central del Dashboard: calcula los partidos que se
   * muestran en pantalla según los filtros activos.
   *
   * Un "getter" se recalcula cada vez que Angular lo necesita para renderizar.
   * Es equivalente a un "computed" en Vue o un "useMemo" en React.
   *
   * El método .filter() de JavaScript recorre el array y devuelve solo
   * los elementos para los cuales la función retorna true.
   */
  get filteredMatches(): Match[] {
    return this.allMatches.filter((match) => {

      // 1. FILTRAR POR STATUS (tab activo)
      // Si el estado del partido no coincide con el tab, lo excluimos
      if (match.status !== this.status) return false;

      // 2. FILTRAR POR BÚSQUEDA DE TEXTO
      // toLowerCase() hace la búsqueda case-insensitive (sin importar mayúsculas)
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const matchFound =
          match.homeTeam.toLowerCase().includes(query) ||
          match.awayTeam.toLowerCase().includes(query) ||
          match.league.toLowerCase().includes(query);

        if (!matchFound) return false;
      }

      // 3. FILTRAR POR COMPETICIÓN
      // Si 'all', mostramos todos. Si no, comparamos con el mapa de nombres.
      if (this.competition !== 'all') {
        const leagueName = this.leagueMap[this.competition];
        if (match.league !== leagueName) return false;
      }

      // Si pasó todos los filtros, incluirlo en el resultado
      return true;
    });
  }

  /** ─── Manejadores de Eventos (escuchan los @Output de los hijos) ──────── */

  /** Actualiza el texto de búsqueda cuando FilterBar emite searchChanged */
  onSearchChange(query: string): void {
    this.searchQuery = query;
  }

  /** Actualiza la competición cuando FilterBar emite competitionChanged */
  onCompetitionChange(competition: string): void {
    this.competition = competition;
  }

  /**
   * Actualiza el tab activo y CIERRA cualquier panel de IA abierto.
   * (Tiene sentido: si cambiás de tab, los panidos cambian, así que cerramos).
   */
  onStatusChange(status: string): void {
    this.status = status;
    this.openAnalysisId = null;
  }

  /**
   * Alterna el panel de IA para un partido específico.
   *
   * LÓGICA:
   * - Si el panel del partido X está abierto Y hacemos click en X → lo cerramos (null)
   * - Si hacemos click en cualquier otro partido → abrimos ese y cerramos el anterior
   *
   * Este método es llamado por el evento (toggleAnalysis) de app-match-card.
   */
  onToggleAnalysis(matchId: string): void {
    this.openAnalysisId = this.openAnalysisId === matchId ? null : matchId;
  }
}
