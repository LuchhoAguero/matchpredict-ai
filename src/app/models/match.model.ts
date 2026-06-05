/**
 * ARCHIVO: match.model.ts
 * PROPÓSITO: Define la "forma" (shape) de los datos de un partido.
 *
 * En TypeScript, una "interface" es como un contrato:
 * describe exactamente qué propiedades tiene un objeto y de qué tipo son.
 * Así, Angular sabe exactamente qué datos esperar de la API (o del mock).
 *
 * El signo "?" al final de una propiedad significa que es OPCIONAL.
 * Por ejemplo, homeScore no existe si el partido no empezó todavía.
 */

export interface Match {
  /** Identificador único del partido */
  id: string;

  /** Nombre completo de la liga (ej: "Premier League") */
  league: string;

  /** Nombre abreviado de la liga (ej: "PL") — para mostrar en tarjetas pequeñas */
  leagueShort: string;

  /** Fecha del partido (ej: "15 Jun" o "Hoy") */
  date: string;

  /** Hora del partido (ej: "16:00" o "En vivo") */
  time: string;

  /** Nombre del equipo local */
  homeTeam: string;

  /** Abreviatura del equipo local (ej: "MCI") */
  homeTeamShort: string;

  /** Nombre del equipo visitante */
  awayTeam: string;

  /** Abreviatura del equipo visitante (ej: "ARS") */
  awayTeamShort: string;

  /**
   * Estado del partido: puede ser uno de estos tres valores.
   * Usar un "union type" (|) limita los valores posibles — evita errores de tipeo.
   * - 'upcoming'  → próximo a jugarse
   * - 'live'      → en curso
   * - 'finished'  → finalizado
   */
  status: 'upcoming' | 'live' | 'finished';

  /** Goles del equipo local — solo existe si el partido empezó */
  homeScore?: number;

  /** Goles del equipo visitante — solo existe si el partido empezó */
  awayScore?: number;

  /** Minuto actual del partido — solo existe si el partido está en vivo */
  minute?: number;
}
