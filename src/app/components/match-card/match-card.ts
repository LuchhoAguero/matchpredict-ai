/**
 * COMPONENTE: MatchCardComponent
 * ARCHIVO: match-card.ts
 * SELECTOR: <app-match-card>
 *
 * Muestra la tarjeta visual de un partido individual.
 * Es un componente "tonto" (dumb/presentational): solo muestra datos
 * y emite eventos — NO maneja estado propio ni lógica de negocio.
 *
 * PATRÓN @Input / @Output — Comunicación Padre → Hijo y Hijo → Padre:
 *
 *   app-dashboard (PADRE)
 *        │
 *        │  @Input()  match          → le ENVÍA los datos del partido
 *        │  @Input()  isAnalysisOpen → le DICE si el panel IA está abierto
 *        │
 *        │  @Output() toggleAnalysis ← el hijo AVISA que el usuario hizo click
 *        ▼
 *   app-match-card (HIJO)
 *
 * El Dashboard es el que decide si el panel abre o cierra.
 * El MatchCard solo PIDE que cambie, emitiendo el evento.
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Match } from '../../models/match.model';
import { AiAnalysisComponent } from '../ai-analysis/ai-analysis';

@Component({
  selector: 'app-match-card',
  standalone: true,
  // Importamos AiAnalysisComponent para poder usar <app-ai-analysis> en el template
  imports: [AiAnalysisComponent],
  templateUrl: './match-card.html',
})
export class MatchCardComponent {

  /**
   * @Input() — Datos que el PADRE le envía al hijo.
   *
   * El signo "!" al final (match!) es "non-null assertion":
   * le dice a TypeScript "confía en mí, este valor SIEMPRE llega".
   * Es necesario porque Angular lo asigna después del constructor.
   */
  @Input() match!: Match;

  /** true si el panel de IA está expandido (lo controla el padre) */
  @Input() isAnalysisOpen: boolean = false;

  /**
   * @Output() — Evento que el hijo le ENVÍA al padre.
   *
   * EventEmitter<void> significa que emite un evento SIN datos adicionales.
   * (Solo avisa "el usuario hizo click", no envía ningún valor).
   *
   * En el template del padre se escucha así:
   *   <app-match-card (toggleAnalysis)="onToggle(match.id)" />
   */
  @Output() toggleAnalysis = new EventEmitter<void>();

  /**
   * GETTERS — propiedades calculadas a partir del @Input match.
   *
   * En vez de escribir "match.status === 'live'" en múltiples lugares del template,
   * lo calculamos UNA VEZ aquí y lo reutilizamos con un nombre descriptivo.
   * Esto hace el código más legible y fácil de mantener.
   */

  /** ¿El partido está en vivo? */
  get isLive(): boolean {
    return this.match.status === 'live';
  }

  /** ¿El partido terminó? */
  get isFinished(): boolean {
    return this.match.status === 'finished';
  }

  /** ¿Hay marcador disponible? (en vivo o finalizado) */
  get hasScore(): boolean {
    return this.isLive || this.isFinished;
  }
}
