/**
 * COMPONENTE: AiAnalysisComponent
 * ARCHIVO: ai-analysis.ts
 * SELECTOR: <app-ai-analysis>
 *
 * Panel de análisis de IA — versión completa basada en el diseño original.
 *
 * DIFERENCIAS CLAVE vs la versión original de React:
 *
 * 1. La función generateMockAnalysis() era una función suelta en React.
 *    En Angular, se convierte en un método PRIVADO de la clase.
 *
 * 2. El original usaba Math.random() en cada render (re-ejecutaba con cada
 *    re-renderizado de React). En Angular eso sería problemático porque
 *    ngOnChanges() y la detección de cambios re-llamarían al getter
 *    constantemente. Solución: usamos ngOnInit() para calcular UNA VEZ
 *    y guardarlo en la propiedad "analysis".
 *
 * 3. Los valores "random" se hacen DETERMINISTAS basados en match.id
 *    para que cada tarjeta muestre datos estables y únicos.
 *
 * CICLO DE VIDA DE ANGULAR — ngOnInit():
 * Angular tiene "hooks" del ciclo de vida — métodos especiales que se
 * ejecutan en momentos específicos. ngOnInit() se ejecuta UNA VEZ,
 * justo después de que Angular asigna los @Input(). Es el lugar ideal
 * para inicializar datos derivados de los inputs.
 *
 * Ciclo simplificado:
 *   constructor() → ngOnInit() → renderizado → ngOnDestroy()
 */
import { Component, Input, OnInit } from '@angular/core';
import { Match } from '../../models/match.model';

/**
 * Interfaz que define la estructura del objeto de análisis.
 * Al tenerla tipada, TypeScript nos avisa si usamos una propiedad incorrecta.
 */
interface MatchAnalysis {
  summary: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  confidence: number;  // 1-5
  favorite: string;
  insights: Array<{
    icon: 'trending' | 'chart' | 'target';
    text: string;
  }>;
}

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [],
  templateUrl: './ai-analysis.html',
})
export class AiAnalysisComponent implements OnInit {

  /** El partido a analizar — viene del app-match-card padre */
  @Input() match!: Match;

  /**
   * El análisis generado. Empieza como null porque aún no se calculó.
   * "!" es non-null assertion: le decimos a TypeScript que lo tendrá
   * valor cuando se use (después de ngOnInit).
   */
  analysis!: MatchAnalysis;

  /** Array para el @for de las barras de confianza */
  readonly confidenceLevels = [1, 2, 3, 4, 5];

  /**
   * ngOnInit() — Hook del ciclo de vida.
   * Se ejecuta DESPUÉS de que Angular asigna el @Input() match.
   * Perfecto para calcular datos derivados del input.
   */
  ngOnInit(): void {
    this.analysis = this.generateAnalysis(this.match);
  }

  /** Convierte el nivel numérico de confianza a texto */
  get confidenceLabel(): string {
    const c = this.analysis?.confidence ?? 0;
    if (c >= 4) return 'Alto';
    if (c >= 2) return 'Medio';
    return 'Bajo';
  }

  /**
   * Genera el análisis del partido de forma DETERMINISTA.
   *
   * "Determinista" = los mismos inputs siempre producen los mismos outputs.
   * A diferencia del original (que usaba Math.random()), aquí usamos
   * datos precalculados por match.id para tener resultados estables.
   *
   * Es "private" porque es un detalle de implementación — nadie fuera
   * de este componente necesita llamarlo directamente.
   */
  private generateAnalysis(match: Match): MatchAnalysis {
    const id = parseInt(match.id);
    const idx = Math.min(id - 1, 11); // índice seguro 0-11

    // Probabilidades de victoria local / empate / visitante
    const probs = [
      [45, 25, 30], [38, 22, 40], [50, 28, 22], [55, 20, 25],
      [40, 25, 35], [35, 28, 37], [60, 22, 18], [32, 38, 30],
      [55, 25, 20], [25, 28, 47], [40, 35, 25], [70, 18, 12],
    ];

    // Niveles de confianza (1-5) por partido
    const confidences = [4, 3, 4, 5, 3, 3, 4, 3, 4, 5, 4, 5];

    // Datos para los textos de los insights
    const homeGoals  = [2.1, 1.8, 2.3, 2.8, 1.6, 1.4, 2.5, 1.2, 2.1, 1.5, 1.8, 2.4];
    const awayGoals  = [1.2, 1.5, 0.9, 1.1, 1.4, 1.6, 0.8, 1.3, 1.0, 1.8, 1.4, 0.6];
    const homeWins   = [4,   3,   4,   5,   3,   3,   4,   3,   4,   2,   3,   5  ];
    const goalsAvg   = [2.8, 3.1, 2.5, 3.2, 2.7, 2.4, 2.9, 2.3, 3.0, 2.6, 2.8, 2.4];
    const unbeaten   = [2,   3,   4,   2,   3,   4,   2,   5,   3,   4,   2,   3  ];

    const [homeWinProb, drawProb, awayWinProb] = probs[idx] ?? [40, 30, 30];
    const confidence = confidences[idx] ?? 3;
    const favorite = homeWinProb > awayWinProb ? match.homeTeam : match.awayTeam;

    return {
      summary: `Basándonos en el análisis de los últimos 10 partidos, estadísticas de posesión, ` +
        `y rendimiento en casa/fuera, ${favorite} llega en mejor forma a este encuentro. ` +
        `${match.homeTeam} ha promediado ${homeGoals[idx]} goles por partido en sus últimas ` +
        `5 presentaciones como local, mientras que la defensa visitante ha concedido ` +
        `${awayGoals[idx]} goles por encuentro.`,

      homeWinProb,
      drawProb,
      awayWinProb,
      confidence,
      favorite,

      insights: [
        {
          icon: 'trending',
          text: `${match.homeTeam} ha ganado ${homeWins[idx]} de sus últimos 5 partidos como local.`,
        },
        {
          icon: 'chart',
          text: `El promedio de goles en enfrentamientos directos es de ${goalsAvg[idx]} por partido.`,
        },
        {
          icon: 'target',
          text: `${match.awayTeam} no ha perdido en sus últimas ${unbeaten[idx]} visitas a este estadio.`,
        },
      ],
    };
  }
}
