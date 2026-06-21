/**
 * SERVICIO: FootballService
 * ARCHIVO: football.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidad única: hablar con el proxy de fútbol y devolver
 * datos ya transformados al formato Match[] que usan los componentes.
 *
 * ARQUITECTURA NUEVA — forkJoin en paralelo:
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   DashboardComponent
 *        │
 *        │ footballService.getMatches()
 *        ▼
 *   FootballService
 *        │
 *        ├── ¿Hay datos en caché? → SÍ → devuelve Match[] al instante (0 HTTP)
 *        │
 *        └── NO → lanza 4 peticiones HTTP EN PARALELO con forkJoin
 *                       │        │        │        │
 *                    Liga AR  Premier  LaLiga   Mundial
 *                       │        │        │        │
 *                       └────────┴────────┴────────┘
 *                                     │
 *                              forkJoin espera a que
 *                              TODAS terminen
 *                                     │
 *                              une los resultados en
 *                              un único Match[] flat
 *                                     │
 *                              guarda en caché
 *                                     │
 *                              devuelve al Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { Match } from '../models/match.model';
import { MOCK_MATCHES } from '../data/mock-matches';

// ─── Interfaces: tipan la respuesta cruda de la API ───────────────────────────

interface ApiFixtureStatus {
  long: string;
  short: string; // 'NS' | '1H' | 'HT' | '2H' | 'FT' | 'AET' | ...
  elapsed: number | null; // Minuto del partido, null si no empezó
}

interface ApiFixture {
  id: number;
  date: string; // ISO 8601: "2025-06-15T20:00:00+00:00"
  status: ApiFixtureStatus;
}

interface ApiTeam {
  id: number;
  name: string;
  logo: string;
}

interface ApiGoals {
  home: number | null;
  away: number | null;
}

interface ApiLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string;
  round: string;
}

interface ApiMatch {
  fixture: ApiFixture;
  league: ApiLeague;
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: ApiGoals;
}

interface ApiResponse {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[];
  results: number;
  response: ApiMatch[]; // ← el array de partidos que nos importa
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * LEAGUE_CONFIG — Ligas y temporadas a consultar con forkJoin.
 *
 * ⚠️  TEMPORADAS EUROPEAS:
 *   La temporada "2024/25" se identifica como season=2024 en la API
 *   (el año de inicio). Esa temporada terminó en mayo 2025.
 *   → Todos sus partidos aparecen como "Finalizados".
 *
 * ⚠️  PARA VER PARTIDOS "PRÓXIMOS" en el tab Upcoming:
 *   Necesitás ligas actualmente en temporada. En junio 2026, opciones:
 *   - Copa Libertadores  (id: 13,  season: 2026)
 *   - Liga Argentina     (id: 128, season: 2026)
 *   - MLS                (id: 253, season: 2026)
 *   Si devuelven 0 resultados, la temporada aún no cargó en la API free tier.
 *
 * TEMPORADAS VERIFICADAS QUE DEVUELVEN DATOS:
 *   - Premier League  (id: 39,  season: 2024) ✅ 380 partidos
 *   - La Liga         (id: 140, season: 2024) ✅ 380 partidos
 *   - Champions League(id: 2,   season: 2024) ✅ 225 partidos
 *   - Liga Argentina  (id: 128, season: 2024) ✅ temporada Apertura/Clausura
 */
/**
 * LEAGUE_CONFIG — Ligas a consultar por liga+temporada.
 * La Copa del Mundo se trae por separado via /fixtures?date=YYYY-MM-DD
 * porque el free tier no soporta consultas por league=1&season=2026.
 *
 * Solo Liga Argentina aquí: reduce las peticiones al mínimo posible.
 * season: 2026 para tener partidos actuales (próximos + en juego).
 */
const LEAGUE_CONFIG = [
  { id: 128, season: 2025, label: 'Liga Argentina 2025' }, // Temporada actual → próximos + en vivo
  { id: 128, season: 2024, label: 'Liga Argentina 2024' }, // Temporada anterior → finalizados garantizados
] as const;

/**
 * IDs de ligas permitidas en el endpoint de fecha.
 * Solo Copa del Mundo (1) y Liga Argentina (128) para minimizar peticiones
 * y ruido de otras competiciones que no mostramos.
 */
const TOP_LEAGUE_IDS = [1, 128];

/**
 * Cuántos partidos traer por liga.
 * Cambiá estos números según cuántas tarjetas quieras mostrar en el Dashboard.
 */
const FINISHED_PER_LEAGUE = 15; // últimos N partidos finalizados por liga
const UPCOMING_PER_LEAGUE = 10; // próximos N partidos por liga (subimos para el Mundial)

// Códigos de estado de la API que consideramos "finalizado" o "en juego"
const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'];
const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE'];

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FootballService {
  private http = inject(HttpClient);

  /**
   * CACHÉ EN MEMORIA
   * Clave: string fija 'all-leagues' (porque ahora traemos todo junto).
   * Valor: Match[] con todos los partidos de todas las ligas configuradas.
   *
   * La API gratuita tiene 50 peticiones/día. Con 4 ligas, cada llamada
   * consume 4 peticiones. La caché nos da 12 llamadas máximas por día.
   */
  private cache = new Map<string, Match[]>();

  /** Clave de caché fija para el conjunto de todas las ligas */
  private readonly CACHE_KEY = 'all-leagues';

  // ──────────────────────────────────────────────────────────────────────────
  // MÉTODO PRINCIPAL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * getMatches() — Trae partidos de múltiples ligas en paralelo con forkJoin.
   *
   * @returns Observable<Match[]> con todos los partidos de las ligas configuradas,
   *          ya filtrados y ordenados (finalizados + próximos).
   */
  getMatches(): Observable<Match[]> {
    if (!environment.production) {
      console.log('[FootballService] Usando mocks en development');
      return of(MOCK_MATCHES);
    }

    // ── VERIFICACIÓN DE CACHÉ ────────────────────────────────────────────────
    if (this.cache.has(this.CACHE_KEY)) {
      console.log('[FootballService] 💾 Caché hit — devolviendo datos sin HTTP');
      return of(this.cache.get(this.CACHE_KEY)!);
    }

    console.log('[FootballService] 🌐 Iniciando peticiones paralelas con forkJoin...');

    // ── OBSERVABLES DE FECHA (últimos 5 días) — captura el Mundial ───────────
    /**
     * El proxy consulta el endpoint de fixtures por fecha para traer partidos por día.
     * ?league=1&season=2026. SÍ permite consultar por ?date=YYYY-MM-DD.
     *
     * Problema: el endpoint de fecha solo devuelve UNA jornada.
     * Solución: consultamos los últimos DAYS_BACK+1 días (hoy + días anteriores)
     * para capturar tanto los partidos de hoy (live/upcoming) como los
     * finalizados de días anteriores del Mundial.
     *
     * DAYS_BACK = 2  → hoy + 2 días atrás  = 3 peticiones de fecha pasadas.
     * DAYS_FORWARD = 5 → 5 días hacia adelante = 5 peticiones de fecha futuras.
     * Total del método: 3 (pasado) + 5 (futuro) + 4 (ligas) = 12 peticiones por sesión.
     */
    const DAYS_BACK = 1; // días hacia atrás (para partidos finalizados recientes)
    const DAYS_FORWARD = 1; // días hacia adelante (para partidos PRÓXIMOS del Mundial)

    // Fechas pasadas: hoy, ayer, hace 2 días
    const pastDateObservables$ = this.getRecentDates(DAYS_BACK).map((date) =>
      this.fetchFixturesByDate(date),
    );

    // Fechas futuras: mañana, pasado mañana ... hasta DAYS_FORWARD días
    const futureDateObservables$ = this.getFutureDates(DAYS_FORWARD).map((date) =>
      this.fetchFixturesByDate(date),
    );

    const dateObservables$ = [...pastDateObservables$, ...futureDateObservables$];

    // ── OBSERVABLES HISTÓRICOS POR LIGA (temporadas pasadas) ─────────────────
    const leagueObservables$ = LEAGUE_CONFIG.map((league) =>
      this.fetchLeagueMatches(league.id, league.season, league.label),
    );

    // ── FORKJOIN: combina TODAS las peticiones en paralelo ───────────────────
    /**
     * forkJoin lanza TODOS los Observables simultáneamente y espera a que
     * TODOS completen. Equivale a Promise.all() pero para RxJS.
     *
     * [...dateObservables$, ...leagueObservables$]
     *   spread operator: une los dos arrays en uno solo:
     *   [hoy$, ayer$, hace2$, hace3$, hace4$, ucl$, arg$, epl$, laliga$]
     *   → 9 peticiones HTTP en PARALELO
     *
     * Emite Match[][] → aplanamos con .flat() → deduplicamos por ID → Match[]
     */
    const totalDateObs = dateObservables$.length;
    return forkJoin([...dateObservables$, ...leagueObservables$]).pipe(
      map((results: Match[][]) => {
        const merged = results.flat();

        /**
         * DEDUPLICACIÓN POR ID
         * Un partido puede aparecer tanto en el endpoint de fecha
         * como en el de liga (poco probable con temporadas pasadas, pero seguro).
         * Map<string, Match> garantiza IDs únicos: si la clave ya existe,
         * el segundo .set() sobreescribe en lugar de duplicar.
         */
        const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values());

        const dateCount = totalDateObs;
        const dateTotal = results.slice(0, dateCount).reduce((s, r) => s + r.length, 0);
        const leagueSummary = results
          .slice(dateCount)
          .map((r, i) => `${LEAGUE_CONFIG[i].label}: ${r.length}`)
          .join(', ');

        console.log(
          `[FootballService] 📦 Total: ${unique.length} únicos ` +
            `(Fechas: ${dateTotal}, ${leagueSummary})`,
        );
        return unique;
      }),

      tap((allMatches: Match[]) => {
        this.cache.set(this.CACHE_KEY, allMatches);
        console.log(`[FootballService] ✅ ${allMatches.length} partidos en caché`);
      }),

      catchError((error) => {
        console.error('[FootballService] ❌ Error en forkJoin:', error);
        return of([]);
      }),
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS: consultas por fecha (Mundial + ligas activas)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * getRecentDates(daysBack) — Genera un array de fechas YYYY-MM-DD.
   *
   * @param daysBack  Cuántos días hacia atrás incluir (0 = solo hoy)
   * @returns string[] de longitud daysBack+1: [hoy, ayer, hace2días, ...]
   *
   * Ejemplo con daysBack=4:
   *   ['2026-06-15', '2026-06-14', '2026-06-13', '2026-06-12', '2026-06-11']
   *
   * new Date() → fecha actual
   * setDate(getDate() - i) → retrocede i días
   * toISOString().split('T')[0] → extrae solo la parte YYYY-MM-DD
   */
  private getRecentDates(daysBack: number): string[] {
    return Array.from({ length: daysBack + 1 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
  }

  /**
   * getFutureDates(daysForward) — Genera un array de fechas FUTURAS YYYY-MM-DD.
   *
   * @param daysForward  Cuántos días hacia adelante incluir (1 = solo mañana)
   * @returns string[] de longitud daysForward: [mañana, pasado, ...]
   *
   * Esto permite traer partidos PRÓXIMOS del Mundial u otras ligas activas
   * que están programados en los días siguientes.
   */
  private getFutureDates(daysForward: number): string[] {
    return Array.from({ length: daysForward }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + (i + 1)); // +1 para empezar desde mañana
      return d.toISOString().split('T')[0];
    });
  }

  /**
   * fetchFixturesByDate(dateStr) — Trae los partidos de UNA fecha específica.
   *
   * Usa /fixtures?date=YYYY-MM-DD → devuelve todas las ligas del mundo ese día.
   * Filtramos con TOP_LEAGUE_IDS para quedarnos solo con las que nos interesan.
   *
   * Para el Mundial: es la ÚNICA forma que funciona en el free tier.
   * (/fixtures?league=1&season=2026 devuelve vacío en el plan gratuito)
   *
   * @param dateStr  Fecha en formato 'YYYY-MM-DD'
   */
  private fetchFixturesByDate(dateStr: string): Observable<Match[]> {
    const url = `${environment.apiFootballUrl}/fixtures?date=${dateStr}`;
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    console.log(`[FootballService] 📅 GET ${isToday ? 'HOY' : dateStr}: ${url}`);

    return this.http.get<ApiResponse>(url).pipe(
      map((apiResponse: ApiResponse) => {
        const apiMatches = this.extractApiMatches(apiResponse);
        const topMatches = apiMatches.filter((m) => TOP_LEAGUE_IDS.includes(m.league.id));
        const leagues = [...new Set(topMatches.map((m) => m.league.name))].join(', ');
        console.log(
          `[FootballService] 🏆 ${dateStr}: ${topMatches.length} partidos top ` +
            `(de ${apiMatches.length} totales)` +
            (leagues ? ` — ${leagues}` : ''),
        );
        return topMatches.map((m) => this.mapApiMatchToMatch(m));
      }),
      catchError((error) => {
        console.error(`[FootballService] ❌ Error en fecha ${dateStr}:`, error.status);
        return of([]);
      }),
    );
  }

  /**
   * fetchLeagueMatches() — Hace UNA petición HTTP para una liga específica
   * y recorta los resultados a los últimos N finalizados + próximos N.
   *
   * @param leagueId  ID de la liga en la API de fútbol
   * @param season    Temporada (ej: 2024, 2025, 2026)
   * @param label     Nombre legible (solo para logs)
   * @returns Observable<Match[]> con máximo FINISHED_PER_LEAGUE + UPCOMING_PER_LEAGUE partidos
   */
  private fetchLeagueMatches(leagueId: number, season: number, label: string): Observable<Match[]> {
    const url = `${environment.apiFootballUrl}/fixtures?league=${leagueId}&season=${season}`;
    console.log(`[FootballService] 🔗 GET ${label}: ${url}`);

    return this.http.get<ApiResponse>(url).pipe(
      map((apiResponse: ApiResponse) => {
        const rawMatches = this.extractApiMatches(apiResponse);

        // ── SEPARAR POR STATUS ──────────────────────────────────────────────
        /**
         * Separamos el array crudo en tres grupos según el estado del partido:
         *   - finished: los que ya terminaron (FT, AET, PEN...)
         *   - live:     los que están en juego (1H, HT, 2H...)
         *   - upcoming: los que aún no empezaron (NS, TBD, PST...)
         *
         * Usamos .filter() de JavaScript — recorre el array y devuelve
         * solo los elementos para los que la función retorna true.
         */
        const finished = rawMatches.filter((m) =>
          FINISHED_STATUSES.includes(m.fixture.status.short),
        );
        const live = rawMatches.filter((m) => LIVE_STATUSES.includes(m.fixture.status.short));
        const upcoming = rawMatches.filter(
          (m) =>
            !FINISHED_STATUSES.includes(m.fixture.status.short) &&
            !LIVE_STATUSES.includes(m.fixture.status.short),
        );

        // ── ORDENAR Y RECORTAR ──────────────────────────────────────────────
        /**
         * Para "finalizados": ordenamos por fecha DESCENDENTE (más reciente primero)
         * y tomamos los últimos FINISHED_PER_LEAGUE partidos.
         *
         * .sort() compara pares de elementos. Cuando el resultado es positivo,
         * b va antes que a (orden descendente).
         *
         * new Date(b.fixture.date) > new Date(a.fixture.date) → b es más reciente → va primero.
         *
         * .slice(0, N) toma los primeros N elementos del array ya ordenado.
         */
        const recentFinished = finished
          .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
          .slice(0, FINISHED_PER_LEAGUE);

        /**
         * Para "próximos": ordenamos por fecha ASCENDENTE (el más cercano primero)
         * y tomamos los próximos UPCOMING_PER_LEAGUE partidos.
         */
        const nextUpcoming = upcoming
          .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
          .slice(0, UPCOMING_PER_LEAGUE);

        // Combinamos: en vivo primero (prioridad), luego próximos, luego finalizados
        const selected = [...live, ...nextUpcoming, ...recentFinished];

        console.log(
          `[FootballService] ✂️  ${label}: ` +
            `${live.length} live, ${nextUpcoming.length} próximos, ` +
            `${recentFinished.length} finalizados → ${selected.length} total`,
        );

        // Transformamos cada ApiMatch al formato Match limpio
        return selected.map((m) => this.mapApiMatchToMatch(m));
      }),

      /**
       * catchError() por liga individual:
       * Si ESTA liga falla (ej: temporada incorrecta, rate limit),
       * devolvemos of([]) → forkJoin recibe [] para esta liga y continúa
       * con las demás. Un fallo en una liga no cancela las otras.
       */
      catchError((error) => {
        console.error(`[FootballService] ❌ Error en ${label}:`, error.status, error.message);
        return of([]);
      }),
    );
  }

  private extractApiMatches(apiResponse: ApiResponse | ApiMatch[] | null | undefined): ApiMatch[] {
    if (Array.isArray(apiResponse)) {
      return apiResponse;
    }

    if (Array.isArray(apiResponse?.response)) {
      return apiResponse.response;
    }

    return [];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MÉTODO PRIVADO: transformación ApiMatch → Match
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * mapApiMatchToMatch() — Patrón Adapter.
   * Convierte el formato crudo de la API al formato limpio de nuestra interfaz Match.
   * Si la API cambia su estructura, solo hay que tocar este método.
   */
  private mapApiMatchToMatch(apiMatch: ApiMatch): Match {
    const { fixture, league, teams, goals } = apiMatch;

    // Determinar el status semántico de nuestra app
    let status: 'upcoming' | 'live' | 'finished';
    if (FINISHED_STATUSES.includes(fixture.status.short)) {
      status = 'finished';
    } else if (LIVE_STATUSES.includes(fixture.status.short)) {
      status = 'live';
    } else {
      status = 'upcoming';
    }

    // Formatear fecha y hora en español
    const dateObj = new Date(fixture.date);
    const dateStr = dateObj.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
    const timeStr = dateObj.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Abreviatura de 3 letras en mayúscula: "Manchester City" → "MAN"
    const short = (name: string) => name.slice(0, 3).toUpperCase();

    return {
      id: String(fixture.id),
      league: league.name,
      leagueShort: league.name.slice(0, 5),
      date: dateStr,
      time: status === 'live' ? `${fixture.status.elapsed}'` : timeStr,
      homeTeam: teams.home.name,
      homeTeamShort: short(teams.home.name),
      awayTeam: teams.away.name,
      awayTeamShort: short(teams.away.name),
      status,
      homeScore: goals.home ?? undefined,
      awayScore: goals.away ?? undefined,
      minute: fixture.status.elapsed ?? undefined,
    };
  }

  /**
   * clearCache() — Fuerza recarga fresca desde la API.
   * Conectalo a un botón "Actualizar" en el Dashboard si querés.
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[FootballService] 🗑️ Caché limpiada — próxima llamada hará HTTP');
  }
}
