/**
 * SERVICIO: FootballService
 * ARCHIVO: football.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Un "servicio" en Angular es una clase que contiene LÓGICA DE NEGOCIO
 * reutilizable — en este caso, todas las llamadas HTTP a la API de fútbol.
 *
 * ¿Por qué separar la lógica en un servicio y no en el componente?
 *   - Reutilizable: cualquier componente puede pedir datos sin duplicar código
 *   - Testeable: podemos probar el servicio aislado del componente
 *   - Responsabilidad única: el componente solo muestra datos, el servicio los obtiene
 *
 * ARQUITECTURA DE ESTE SERVICIO:
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   DashboardComponent
 *        │
 *        │ footService.getMatches('2024', '1', 'all')
 *        ▼
 *   FootballService
 *        │
 *        ├── ¿Hay datos en caché? → SÍ → devuelve los datos (0 peticiones HTTP)
 *        │
 *        └── ¿Hay datos en caché? → NO → petición HTTP → guarda en caché → devuelve datos
 *
 * FLUJO RxJS (para entender los operadores):
 *
 *   this.http.get(url, { headers })  ← Observable<ApiResponse>
 *        │
 *        │ .pipe()  ← "tubería" que encadena transformaciones
 *        │
 *        ├── map(response => ...)     ← transforma el objeto de la API al formato Match[]
 *        │
 *        └── catchError(err => ...)  ← captura errores y devuelve array vacío (no rompe la app)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

// Importamos el environment. Angular CLI reemplaza esto con
// environment.development.ts cuando corrés "ng serve".
import { environment } from '../../environments/environment';

// La interfaz Match que ya definimos — así TypeScript valida los datos
import { Match } from '../models/match.model';

// ─── Interfaces para tipar la respuesta de API-Football ───────────────────────
// La API devuelve una estructura compleja — la tipamos para no perdernos.

/** Estructura del fixture (partido) en la respuesta de API-Football */
interface ApiFixture {
  id: number;
  date: string;
  status: {
    short: string;  // 'NS' = Not Started, 'FT' = Full Time, '1H' = First Half, etc.
    elapsed: number | null;  // Minuto actual del partido (null si no empezó)
  };
}

/** Estructura de un equipo en la respuesta de API-Football */
interface ApiTeam {
  id: number;
  name: string;
  logo: string;
}

/** Estructura de los goles en la respuesta */
interface ApiGoals {
  home: number | null;
  away: number | null;
}

/** Estructura de la liga en la respuesta */
interface ApiLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string;
  round: string;
}

/** Un partido completo en la respuesta de API-Football */
interface ApiMatch {
  fixture: ApiFixture;
  league: ApiLeague;
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: ApiGoals;
}

/** La respuesta completa de la API */
interface ApiResponse {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[];
  results: number;
  response: ApiMatch[];  // El array de partidos que nos importa
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @Injectable({ providedIn: 'root' })
 *
 * Este decorador le dice a Angular dos cosas:
 * 1. Que esta clase ES un servicio inyectable
 * 2. providedIn: 'root' → es un SINGLETON: existe una sola instancia en toda la app
 *    (como una variable global pero gestionada por Angular)
 *
 * Un "singleton" es importante para la caché: si hubiera múltiples instancias,
 * cada una tendría su propia caché separada y la optimización no funcionaría.
 */
@Injectable({ providedIn: 'root' })
export class FootballService {

  /**
   * inject() — Forma moderna de inyección de dependencias en Angular 14+
   * Es equivalente a declarar "constructor(private http: HttpClient) {}"
   * pero más concisa y funciona fuera del constructor también.
   */
  private http = inject(HttpClient);

  /**
   * CACHÉ EN MEMORIA
   * ─────────────────────────────────────────────────────────────────────────
   * Un Map<string, Match[]> donde:
   *   - La clave (string) es la combinación de parámetros de la búsqueda
   *     Ejemplo: "2024-1-all" para temporada 2024, liga 1, todos los estados
   *   - El valor (Match[]) es el array de partidos ya procesados
   *
   * ¿Por qué un Map y no un simple array?
   * Con un Map podemos guardar MÚLTIPLES caché diferentes:
   *   "2024-1-all"   → partidos de La Liga 2024
   *   "2024-140-all" → partidos de la Champions 2024
   *   etc.
   *
   * La API gratuita permite 50 peticiones/día — sin caché, el usuario agotaría
   * el límite en minutos al filtrar por diferentes ligas.
   */
  private cache = new Map<string, Match[]>();

  /**
   * Headers HTTP requeridos por API-Football (RapidAPI format).
   * Se leen del environment → la key nunca queda hardcodeada en el código.
   *
   * HttpHeaders es la clase de Angular para crear cabeceras HTTP.
   * Es inmutable: cada "set" devuelve un objeto nuevo (no modifica el original).
   */
  private get apiHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-rapidapi-key':  environment.apiFootballKey,
      'x-rapidapi-host': environment.apiFootballHost,
    });
  }

  /**
   * getMatches() — Método principal del servicio.
   *
   * @param season  Temporada (ej: '2024')
   * @param leagueId ID de la liga en API-Football (ej: '140' = La Liga, '39' = Premier League)
   * @param round  Ronda del torneo o 'all' para todos
   * @returns Observable<Match[]> — un "stream" que emite el array de partidos
   *
   * ¿Qué es un Observable?
   * ─────────────────────────────────────────────────────────────────────────
   * Un Observable es como una "promesa mejorada". Representa un valor futuro
   * que puede llegar de forma asincrónica (desde la red, un timer, etc.)
   *
   * El componente que llame a getMatches() debe "suscribirse" al Observable:
   *   this.footballService.getMatches('2024', '140', 'all').subscribe(matches => {
   *     this.matches = matches;  // aquí llegan los datos
   *   });
   */
  getMatches(season: string, leagueId: string, round: string): Observable<Match[]> {

    // Creamos una clave única para esta combinación de parámetros
    // Así podemos tener caché separada para cada liga/temporada
    const cacheKey = `${season}-${leagueId}-${round}`;

    // ─── VERIFICACIÓN DE CACHÉ ────────────────────────────────────────────
    // this.cache.has(cacheKey) devuelve true si ya tenemos datos para esta clave
    if (this.cache.has(cacheKey)) {
      console.log(`[FootballService] 💾 Caché hit para: ${cacheKey}`);

      /**
       * of() crea un Observable "instantáneo" que emite el valor dado de inmediato
       * y se completa. Es la forma de "envolver" un valor sincrónico en un Observable.
       *
       * this.cache.get(cacheKey)! — el "!" es non-null assertion:
       * le decimos a TypeScript "sé que no es undefined porque ya verifiqué con .has()"
       */
      return of(this.cache.get(cacheKey)!);
    }

    // ─── PETICIÓN HTTP (solo si no hay caché) ────────────────────────────
    console.log(`[FootballService] 🌐 Petición HTTP para: ${cacheKey}`);

    // Construimos la URL del endpoint
    const url = `${environment.apiFootballUrl}/fixtures?season=${season}&league=${leagueId}`;

    /**
     * this.http.get<ApiResponse>(url, { headers })
     *
     * .get<ApiResponse>() es un método genérico:
     *   - El tipo entre <> le dice a TypeScript cómo tipear la respuesta
     *   - url: la dirección del endpoint
     *   - { headers: this.apiHeaders }: los headers con la API Key
     *
     * Esto retorna un Observable<ApiResponse> — los datos aún no llegaron,
     * solo estamos definiendo CÓMO obtenerlos cuando alguien se suscriba.
     */
    return this.http.get<ApiResponse>(url, { headers: this.apiHeaders }).pipe(

      /**
       * .pipe() encadena operadores RxJS que transforman el Observable.
       * Funciona como una tubería: la respuesta entra por un extremo
       * y sale transformada por el otro.
       */

      /**
       * tap() — "Espiar" el Observable sin modificarlo.
       * Se usa para efectos secundarios (logging, guardar en caché).
       * tap NO transforma los datos — solo "hace algo" y los deja pasar.
       *
       * Guardamos en caché ANTES de mapear para tener los datos crudos
       * listos, pero en este caso lo hacemos DESPUÉS de mapear para
       * guardar los datos ya limpios (formato Match[]).
       */

      /**
       * map() — Transforma cada valor que emite el Observable.
       *
       * Recibe la respuesta completa de la API (ApiResponse) y la convierte
       * a Match[] usando la función privada mapApiMatchToMatch() de abajo.
       *
       * Equivalente a Array.map() pero para Observables.
       *
       * response.response es el array de partidos dentro del objeto de la API:
       * {
       *   "get": "fixtures",
       *   "response": [ ...array de partidos aquí... ]
       * }
       */
      map((response: ApiResponse) => {
        const matches = response.response.map(
          (apiMatch) => this.mapApiMatchToMatch(apiMatch)
        );
        return matches;
      }),

      /**
       * tap() — Después de mapear, guardamos los datos limpios en caché.
       *
       * ¿Por qué después del map()? Porque queremos guardar Match[]
       * (datos limpios) y no ApiResponse (datos crudos de la API).
       */
      tap((matches: Match[]) => {
        this.cache.set(cacheKey, matches);
        console.log(`[FootballService] ✅ ${matches.length} partidos guardados en caché`);
      }),

      /**
       * catchError() — Captura cualquier error HTTP y lo maneja gracefully.
       *
       * Sin catchError(), si la API devuelve un error 401 (unauthorized),
       * el Observable falla y el componente no recibe nada — pantalla rota.
       *
       * Con catchError(), atrapamos el error, lo logueamos, y devolvemos
       * un Observable de array vacío (of([])) — la app sigue funcionando.
       *
       * El parámetro "error" contiene el HttpErrorResponse con:
       *   error.status  → código HTTP (401, 429, 500, etc.)
       *   error.message → descripción del error
       */
      catchError((error) => {
        console.error('[FootballService] ❌ Error en la petición HTTP:', error);

        if (error.status === 401) {
          console.error('API Key inválida — verificá environment.development.ts');
        } else if (error.status === 429) {
          console.error('Límite de 50 peticiones diarias alcanzado');
        }

        // of([]) retorna un Observable que emite un array vacío — sin crashear la app
        return of([]);
      })
    );
  }

  /**
   * mapApiMatchToMatch() — Transforma el formato complejo de la API
   * al formato limpio de nuestra interfaz Match.
   *
   * ¿Por qué es necesario?
   * La API devuelve objetos anidados y con nombres de campos distintos.
   * Nuestros componentes esperan el formato Match definido en match.model.ts.
   * Este método hace la traducción.
   *
   * Es "private" porque es un detalle de implementación —
   * nadie fuera de este servicio necesita llamarlo.
   */
  private mapApiMatchToMatch(apiMatch: ApiMatch): Match {
    const { fixture, league, teams, goals } = apiMatch;

    // Determinamos el status basándonos en el código de la API:
    // 'NS' = Not Started, 'FT' = Full Time, 'AET' = After Extra Time
    // '1H', '2H', 'HT', 'ET', 'BT', 'P' = algún tipo de "en juego"
    const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];
    const finishedStatuses = ['FT', 'AET', 'PEN'];

    let status: 'upcoming' | 'live' | 'finished';
    if (finishedStatuses.includes(fixture.status.short)) {
      status = 'finished';
    } else if (liveStatuses.includes(fixture.status.short)) {
      status = 'live';
    } else {
      status = 'upcoming';
    }

    // Formateamos la fecha: "2024-06-15T16:00:00+00:00" → "15 Jun"
    const dateObj = new Date(fixture.date);
    const dateStr = dateObj.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });

    // Formateamos la hora: "2024-06-15T16:00:00+00:00" → "16:00"
    const timeStr = dateObj.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Abreviatura del equipo: tomamos las primeras 3 letras en mayúscula
    // Ejemplo: "Manchester City" → "MAN"
    const getShort = (name: string) => name.slice(0, 3).toUpperCase();

    // Retornamos el objeto en el formato exacto de nuestra interfaz Match
    return {
      id:            String(fixture.id),
      league:        league.name,
      leagueShort:   league.name.slice(0, 5),
      date:          dateStr,
      time:          status === 'live' ? 'En vivo' : timeStr,
      homeTeam:      teams.home.name,
      homeTeamShort: getShort(teams.home.name),
      awayTeam:      teams.away.name,
      awayTeamShort: getShort(teams.away.name),
      status,
      // Los goles son null en la API si el partido no empezó → los omitimos
      homeScore:     goals.home ?? undefined,
      awayScore:     goals.away ?? undefined,
      minute:        fixture.status.elapsed ?? undefined,
    };
  }

  /**
   * clearCache() — Limpia la caché manualmente.
   *
   * Útil para forzar una recarga fresca desde la API.
   * Podría llamarse desde un botón "Actualizar" en el Dashboard.
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[FootballService] 🗑️ Caché limpiada');
  }
}
