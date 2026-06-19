/**
 * COMPONENTE: DashboardComponent
 * ARCHIVO: dashboard.ts
 * SELECTOR: <app-dashboard>
 *
 * Es el componente "inteligente" (smart/container component).
 * Contiene todo el ESTADO de la pantalla de dashboard y la lógica de filtrado.
 *
 * RESPONSABILIDADES:
 *   1. Pedir los partidos de HOY al FootballService en ngOnInit
 *   2. Guardar el estado de los filtros (searchQuery, competition, status)
 *   3. Calcular los partidos filtrados (filteredMatches) cruzando todos los criterios
 *   4. Controlar cuál tarjeta tiene el panel de IA abierto (openAnalysisId)
 *   5. Pasar datos a los hijos (FilterBar, MatchCard) via @Input
 *   6. Escuchar eventos de los hijos via @Output y actualizar el estado
 *
 * ÁRBOL DE COMPONENTES:
 *   app-dashboard
 *   ├── app-filter-bar  (recibe estado, emite cambios)
 *   └── app-match-card × N  (recibe cada partido + estado del panel IA)
 *       └── app-ai-analysis  (panel desplegable, recibe el partido)
 *
 * FLUJO DE DATOS:
 *
 *   ngOnInit()
 *       │
 *       ▼
 *   FootballService.getMatches()  ← petición HTTP (o caché)
 *       │
 *       ▼
 *   allMatches[] ← se llena con los datos limpios de la API
 *       │
 *       ▼
 *   filteredMatches getter ← aplica los 3 filtros cruzados
 *       │
 *       ▼
 *   @for (match of filteredMatches) → app-match-card
 */
import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { Match } from '../../models/match.model';
import { FilterBarComponent } from '../filter-bar/filter-bar';
import { MatchCardComponent } from '../match-card/match-card';

// Importamos el servicio que habla con la API de api-sports.io
import { FootballService } from '../../services/football.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  // Importamos los dos componentes hijos directos del template
  imports: [FilterBarComponent, MatchCardComponent],
  templateUrl: './dashboard.html',
})

/**
 * Implementamos OnInit — interfaz de Angular que obliga a definir ngOnInit().
 * ngOnInit() se ejecuta UNA SOLA VEZ, justo después de que Angular
 * inicializa el componente y sus @Inputs. Es el lugar correcto para
 * pedir datos a servicios (nunca en el constructor).
 */
export class DashboardComponent implements OnInit {

  /**
   * inject() — Inyección de dependencias moderna (Angular 14+).
   * Equivale a escribir: constructor(private footballService: FootballService) {}
   * pero más concisa y puede usarse fuera del constructor también.
   *
   * Angular se encarga de crear la instancia del servicio y pasárnosla.
   * Como el servicio es providedIn: 'root', es un singleton —
   * el mismo objeto con la misma caché para toda la app.
   */
  private footballService = inject(FootballService);
  private platformId = inject(PLATFORM_ID);

  /** ─── Estado de Carga ─────────────────────────────────────────────────── */

  /**
   * isLoading: controla el spinner/skeleton de carga.
   * Empieza en true → mostramos indicador de carga.
   * Cuando llegan los datos → lo ponemos en false → mostramos las tarjetas.
   */
  isLoading: boolean = false;

  /**
   * hasError: true si la petición HTTP falló (ej: API Key incorrecta,
   * límite de 50 peticiones diarias alcanzado, sin conexión, etc.)
   */
  hasError: boolean = false;

  /** ─── Estado de los Filtros ─────────────────────────────────────────── */

  /** Texto de búsqueda actual (sincronizado con el input del FilterBar) */
  searchQuery: string = '';

  /** Competición seleccionada. 'all' = mostrar todas */
  competition: string = 'all';

  /** Tab activo en el FilterBar: 'upcoming', 'live' o 'finished' */
  status: string = 'upcoming';

  /** ─── Estado del Panel de IA ──────────────────────────────────────────── */

  /**
   * ID del partido que tiene el panel de IA abierto.
   * null = ningún panel está abierto.
   * Por diseño, solo puede haber UN panel abierto a la vez.
   */
  openAnalysisId: string | null = null;

  /** ─── Datos de Partidos ───────────────────────────────────────────────── */

  /**
   * Todos los partidos que devolvió el servicio (sin filtrar).
   * Empieza vacío. Se llena en ngOnInit() cuando llega la respuesta de la API.
   * El getter filteredMatches lee de este array para calcular el subconjunto visible.
   */
  allMatches: Match[] = [];

  /**
   * Mapa para convertir los valores del <select> a nombres de liga reales.
   * El select usa slugs como 'premier-league', pero los datos de la API usan
   * los nombres completos como 'Premier League'.
   * Necesitamos este mapa para comparar correctamente en el filtro de competición.
   */
  private readonly leagueMap: Record<string, string> = {
    // El nombre DEBE coincidir exactamente con lo que devuelve la API en league.name
    // Solo las dos fuentes activas (FootballService LEAGUE_CONFIG + TOP_LEAGUE_IDS)
    'copa-mundial':   'World Cup',
    'liga-argentina': 'Liga Profesional Argentina',
  };

  /** ─── Ciclo de Vida ───────────────────────────────────────────────────── */

  /**
   * ngOnInit() — Se ejecuta AUTOMÁTICAMENTE una vez, al montar el componente.
   *
   * Aquí realizamos la petición HTTP (a través del servicio).
   * .subscribe() es cómo "nos suscribimos" a un Observable para recibir sus datos.
   *
   * El objeto que le pasamos a subscribe tiene tres callbacks:
   *   next:     se llama cuando llegan datos exitosamente
   *   error:    se llama si hay un error de red o HTTP
   *   complete: se llama cuando el Observable termina (no siempre necesario)
   */
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => this.loadMatches());
  }

  private loadMatches(): void {
    this.isLoading = true;
    this.hasError  = false;

    /**
     * getTodayMatches() — Pide los partidos de la fecha actual.
     * El servicio calcula la fecha internamente con new Date().
     * Si ya se pidieron hoy (caché hit), devuelve los datos sin HTTP.
     */
    this.footballService
      .getMatches()
      .subscribe({

        /**
         * next: se llama cuando el Observable emite el array de partidos.
         * "matches" aquí es el Match[] que devolvió el servicio tras mapear
         * la respuesta de la API (o desde la caché si ya se pidió antes).
         */
        next: (matches: Match[]) => {
          this.allMatches = matches;
          this.isLoading  = false;

          console.log(`[Dashboard] ✅ ${matches.length} partidos recibidos`);
        },

        /**
         * error: se llama si el Observable emite un error.
         * En nuestro FootballService usamos catchError() para devolver of([])
         * en vez de propagar el error, así que este callback raramente se activa.
         * Lo dejamos como red de seguridad adicional.
         */
        error: (err) => {
          console.error('[Dashboard] ❌ Error al cargar partidos:', err);
          this.hasError  = true;
          this.isLoading = false;
        },
      });
  }

  /** ─── GETTER: filteredMatches ─────────────────────────────────────────── */

  /**
   * filteredMatches — La lógica central del Dashboard.
   *
   * Un "getter" en TypeScript es una propiedad calculada: se ve como una
   * propiedad (this.filteredMatches) pero ejecuta código cuando se lee.
   * Angular lo re-evalúa en cada ciclo de detección de cambios,
   * por eso el template siempre muestra los resultados actualizados.
   *
   * FILTRADO COMBINADO:
   * Usamos Array.filter() que recorre allMatches y devuelve solo
   * los elementos para los cuales la función callback retorna true.
   * Los tres criterios se aplican en SERIE (AND lógico):
   * un partido debe pasar los TRES filtros para aparecer en pantalla.
   *
   * CRITERIO 1: Status (tab activo)
   * CRITERIO 2: Búsqueda de texto (equipo local, visitante o liga)
   * CRITERIO 3: Competición seleccionada en el dropdown
   */
  get filteredMatches(): Match[] {
    return this.allMatches.filter((match) => {

      // ── CRITERIO 1: FILTRAR POR STATUS (tab activo) ──────────────────────
      // Si el estado del partido no coincide con el tab seleccionado, lo descartamos.
      // Ejemplo: si el tab activo es 'live', solo pasan los partidos con status 'live'.
      if (match.status !== this.status) return false;

      // ── CRITERIO 2: FILTRAR POR BÚSQUEDA DE TEXTO ────────────────────────
      // Solo aplicamos este filtro si el usuario escribió algo (trim() elimina espacios).
      // toLowerCase() hace la búsqueda case-insensitive: "liverpool" = "Liverpool".
      // includes() devuelve true si el string contiene el texto buscado.
      // Buscamos en homeTeam, awayTeam Y league simultáneamente (OR lógico entre ellos).
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const matchFound =
          match.homeTeam.toLowerCase().includes(query) ||
          match.awayTeam.toLowerCase().includes(query) ||
          match.league.toLowerCase().includes(query);

        if (!matchFound) return false;
      }

      // ── CRITERIO 3: FILTRAR POR COMPETICIÓN ──────────────────────────────
      // Si el valor es 'all', mostramos todas las ligas — no filtramos.
      // Si es otra cosa (ej: 'la-liga'), convertimos el slug al nombre real
      // usando el leagueMap y comparamos con el campo league del partido.
      if (this.competition !== 'all') {
        const leagueName = this.leagueMap[this.competition];
        if (match.league !== leagueName) return false;
      }

      // Si el partido pasó los TRES criterios → lo incluimos en el resultado
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
   * Al cambiar de tab, los partidos cambian completamente,
   * así que es lógico cerrar el panel para evitar mostrar análisis desfasados.
   */
  onStatusChange(newStatus: string): void {
    this.status = newStatus;
    this.openAnalysisId = null;
  }

  /**
   * Alterna el panel de IA para un partido específico.
   *
   * LÓGICA TOGGLE:
   * - Si el panel del partido X está abierto Y hacemos click en X → cerramos (null)
   * - Si hacemos click en cualquier otro partido → abrimos ese y cerramos el anterior
   *
   * Este "one-at-a-time" pattern evita que múltiples paneles se abran juntos
   * y el usuario se abrume con información.
   */
  onToggleAnalysis(matchId: string): void {
    this.openAnalysisId = this.openAnalysisId === matchId ? null : matchId;
  }
}
