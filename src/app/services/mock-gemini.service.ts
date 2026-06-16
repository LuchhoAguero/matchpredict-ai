/**
 * SERVICIO: MockGeminiService
 * ARCHIVO: mock-gemini.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Simula una petición a la API de Gemini (Google AI) sin consumir cuota real.
 *
 * FLUJO:
 *   analyzeMatch(match) llamado
 *         │
 *         ▼
 *   ¿match.status === 'finished'?
 *     SÍ → buildPostMatchAnalysis()  → resumen táctico con goles reales
 *     NO → buildPreMatchAnalysis()   → predicción con probabilidades %
 *         │
 *         ▼
 *   of(resultado).pipe(delay(1500)) → simula latencia de red
 *         │
 *         ▼
 *   .subscribe(next: fn) → componente recibe GeminiAnalysis
 */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Match } from '../models/match.model';

// ─── Interfaces públicas ───────────────────────────────────────────────────────

/**
 * GeminiAnalysis — Contrato base de la respuesta de análisis.
 * Campos compartidos entre predicción pre-partido y resumen post-partido.
 */
export interface GeminiAnalysis {
  /** Tipo de análisis: determina qué sección del template se muestra */
  type: 'pre-match' | 'post-match';

  /** Párrafo de conclusión general */
  conclusion: string;

  /** Array de 3 datos estadísticos o tácticos clave */
  insights: string[];

  /** Nivel de certeza del modelo: 'Alto' | 'Medio' | 'Bajo' */
  confidenceLevel: 'Alto' | 'Medio' | 'Bajo';

  /**
   * Probabilidades de resultado — SOLO para pre-match (upcoming/live).
   * undefined en análisis post-partido (ya se jugó, no tiene sentido predecir).
   */
  probabilities?: {
    home: number; // % victoria local
    draw: number; // % empate
    away: number; // % victoria visitante
  };

  /**
   * Métricas de rendimiento — SOLO para post-match (finished).
   * undefined en análisis pre-partido.
   */
  metrics?: {
    posesionLocal:     number; // % posesión equipo local
    posesionVisitante: number; // % posesión equipo visitante
    tirosLocal:        number; // remates al arco local
    tirosVisitante:    number; // remates al arco visitante
  };
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MockGeminiService {

  /**
   * analyzeMatch() — Método principal. Recibe el Match COMPLETO.
   *
   * @param match  Objeto Match con status, equipos, goles, etc.
   * @returns Observable<GeminiAnalysis> que emite tras 1.5s y completa.
   *
   * EDGE CASE manejado:
   *   Si match.status === 'finished' → análisis post-partido con goles reales.
   *   Si match.status === 'upcoming' | 'live' → predicción con probabilidades.
   */
  analyzeMatch(match: Match): Observable<GeminiAnalysis> {

    // Semilla determinista: mismos equipos → mismos datos en cada llamada
    const seed = (match.homeTeam.length + match.awayTeam.length) % 3; // 0, 1 o 2

    const result: GeminiAnalysis =
      match.status === 'finished'
        ? this.buildPostMatchAnalysis(match, seed)
        : this.buildPreMatchAnalysis(match, seed);

    return of(result).pipe(delay(1500));
  }

  // ─── ANÁLISIS PRE-PARTIDO (upcoming / live) ──────────────────────────────────

  /**
   * buildPreMatchAnalysis() — Genera una PREDICCIÓN del partido.
   * Se usa cuando el partido todavía no terminó (upcoming o live).
   * Devuelve probabilidades % y análisis estadístico previo.
   */
  private buildPreMatchAnalysis(match: Match, seed: number): GeminiAnalysis {
    const { homeTeam, awayTeam } = match;

    const probSets: NonNullable<GeminiAnalysis['probabilities']>[] = [
      { home: 48, draw: 24, away: 28 },
      { home: 35, draw: 27, away: 38 },
      { home: 55, draw: 22, away: 23 },
    ];

    const confidenceLevels: GeminiAnalysis['confidenceLevel'][] = [
      'Alto', 'Medio', 'Alto',
    ];

    const probs      = probSets[seed];
    const confidence = confidenceLevels[seed];
    const favorite   = probs.home >= probs.away ? homeTeam : awayTeam;
    const underdog   = favorite === homeTeam ? awayTeam : homeTeam;

    return {
      type: 'pre-match',

      conclusion:
        `Basándonos en el historial reciente, el enfrentamiento entre ` +
        `${homeTeam} y ${awayTeam} se proyecta muy parejo. ` +
        `${favorite} llega con ventaja estadística gracias a su rendimiento ` +
        `en los últimos 5 encuentros, donde demostró solidez tanto en defensa ` +
        `como en la generación de ocasiones de gol. ` +
        `Sin embargo, ${underdog} no debe subestimarse: ` +
        `su presión alta y transiciones rápidas pueden desequilibrar ` +
        `el partido en cualquier momento.`,

      probabilities: probs,

      insights: [
        `${homeTeam} convirtió en sus últimos 4 partidos como local, ` +
          `promediando 2.1 goles por encuentro.`,
        `El historial directo entre ${homeTeam} y ${awayTeam} ` +
          `muestra un promedio de 2.8 goles totales por partido.`,
        `${awayTeam} llega invicto en sus últimas 3 visitas, ` +
          `lo que eleva la incertidumbre del resultado.`,
      ],

      confidenceLevel: confidence,
    };
  }

  // ─── ANÁLISIS POST-PARTIDO (finished) ────────────────────────────────────────

  /**
   * buildPostMatchAnalysis() — Genera un RESUMEN TÁCTICO del partido terminado.
   * Usa los goles reales (match.homeScore / match.awayScore) para personalizar
   * el texto de conclusión, haciendo el análisis más auténtico y convincente.
   */
  private buildPostMatchAnalysis(match: Match, seed: number): GeminiAnalysis {
    const { homeTeam, awayTeam, homeScore, awayScore } = match;

    // ── Determinar resultado real ──────────────────────────────────────────────
    const hG = homeScore ?? 0;
    const aG = awayScore ?? 0;

    let winner: string;
    let loser: string;
    let resultText: string;

    if (hG > aG) {
      winner     = homeTeam;
      loser      = awayTeam;
      resultText = `${homeTeam} se impuso como local por ${hG} a ${aG}`;
    } else if (aG > hG) {
      winner     = awayTeam;
      loser      = homeTeam;
      resultText = `${awayTeam} se llevó el triunfo de visitante por ${aG} a ${hG}`;
    } else {
      winner     = '';
      loser      = '';
      resultText = `El partido terminó en empate ${hG} a ${aG}`;
    }

    // ── Métricas simuladas pero coherentes con el resultado ───────────────────
    const metricSets: NonNullable<GeminiAnalysis['metrics']>[] = [
      { posesionLocal: 58, posesionVisitante: 42, tirosLocal: 14, tirosVisitante: 8  },
      { posesionLocal: 44, posesionVisitante: 56, tirosLocal: 9,  tirosVisitante: 15 },
      { posesionLocal: 52, posesionVisitante: 48, tirosLocal: 11, tirosVisitante: 10 },
    ];

    // Si ganó el local → set 0 (posesión local mayor)
    // Si ganó el visitante → set 1 (posesión visitante mayor)
    // Si empate → set 2 (parejo)
    const metricIndex = hG > aG ? 0 : aG > hG ? 1 : 2;
    const metrics = metricSets[metricIndex];

    const conclusionBody = winner
      ? `${resultText}. El ganador demostró superioridad táctica especialmente ` +
        `en la presión sobre la salida rival y en las acciones a pelota parada. ` +
        `${loser} tuvo momentos de juego, pero no logró capitalizar las ocasiones ` +
        `que generó durante el segundo tiempo.`
      : `${resultText}. Ambos equipos mostraron solidez defensiva y el partido ` +
        `fue parejo de principio a fin. Las pocas ocasiones de gol que se generaron ` +
        `no encontraron definición, lo que refleja el nivel de exigencia de ambas defensas.`;

    const confidenceLevels: GeminiAnalysis['confidenceLevel'][] = [
      'Alto', 'Alto', 'Medio',
    ];

    return {
      type: 'post-match',
      conclusion: conclusionBody,
      metrics,
      insights: [
        winner
          ? `${winner} mantuvo la presión alta durante los primeros 30 minutos, ` +
            `generando las condiciones para el primer gol.`
          : `Ningún equipo logró imponer su juego de manera sostenida durante los 90 minutos.`,

        `El partido registró ${hG + aG} ${hG + aG === 1 ? 'gol' : 'goles'} en total, ` +
          `con ${metrics.tirosLocal + metrics.tirosVisitante} remates combinados entre ambos equipos.`,

        winner
          ? `La defensa de ${loser} cometió errores de posicionamiento en ` +
            `transiciones rápidas, que ${winner} supo aprovechar con efectividad.`
          : `Ambas defensas cerraron bien los espacios, impidiendo que los delanteros ` +
            `recibieran en profundidad durante gran parte del partido.`,
      ],
      confidenceLevel: confidenceLevels[seed],
    };
  }
}
