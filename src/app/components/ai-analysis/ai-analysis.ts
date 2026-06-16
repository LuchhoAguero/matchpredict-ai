/**
 * COMPONENTE: AiAnalysisComponent
 * ARCHIVO: ai-analysis.ts
 * SELECTOR: <app-ai-analysis>
 *
 * Panel de análisis de IA.
 *
 * CAMBIO CLAVE vs la versión anterior:
 * Antes: generaba el análisis INTERNAMENTE con Math aleatorio en ngOnInit().
 * Ahora: RECIBE el análisis como @Input() desde el MatchCard padre,
 *        que a su vez lo obtiene del MockGeminiService.
 *
 * También recibe @Input() isAnalyzing para mostrar el spinner mientras
 * el servicio "viaja a los servidores de Google" (delay de 1.5s).
 *
 * FLUJO DE DATOS:
 *   MockGeminiService
 *        │ GeminiAnalysis
 *        ▼
 *   MatchCardComponent
 *        │ [analysis]="analysis"
 *        │ [isAnalyzing]="isAnalyzing"
 *        ▼
 *   AiAnalysisComponent  ← este archivo
 */
import { Component, Input } from '@angular/core';
import { Match } from '../../models/match.model';
import { GeminiAnalysis } from '../../services/mock-gemini.service';

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [],
  templateUrl: './ai-analysis.html',
})
export class AiAnalysisComponent {

  /** El partido — se sigue usando para mostrar los nombres de equipos en el HTML */
  @Input() match!: Match;

  /**
   * El análisis generado por MockGeminiService, recibido del padre.
   * null → todavía cargando (o panel recién abierto).
   * GeminiAnalysis → datos listos para mostrar.
   */
  @Input() analysis: GeminiAnalysis | null = null;

  /**
   * true mientras el MockGeminiService está "procesando" (durante el delay).
   * El template lo usa para mostrar el spinner de carga.
   */
  @Input() isAnalyzing: boolean = false;

  /** Array para el @for de las barras de confianza (5 barras) */
  readonly confidenceLevels = [1, 2, 3, 4, 5];

  /**
   * confidenceScore — Convierte el string 'Alto'|'Medio'|'Bajo'
   * a un número del 1 al 5 para alimentar las barras del indicador.
   *
   * 'Alto'  → 5 barras llenas
   * 'Medio' → 3 barras llenas
   * 'Bajo'  → 1 barra llena
   */
  get confidenceScore(): number {
    switch (this.analysis?.confidenceLevel) {
      case 'Alto':  return 5;
      case 'Medio': return 3;
      case 'Bajo':  return 1;
      default:      return 0;
    }
  }
}

