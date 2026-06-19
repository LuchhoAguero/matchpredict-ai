/**
 * COMPONENTE: MatchCardComponent
 * ARCHIVO: match-card.ts
 * SELECTOR: <app-match-card>
 *
 * Muestra la tarjeta visual de un partido individual.
 *
 * RESPONSABILIDADES ACTUALIZADAS:
 *   1. Mostrar los datos del partido (equipo, marcador, estado)
 *   2. Gestionar el ciclo de análisis IA:
 *        click botón → isAnalyzing = true → llama MockGeminiService
 *        → recibe respuesta → isAnalyzing = false → muestra panel
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
 *        │
 *        │  inject(MockGeminiService) → llama al mock al hacer click
 *        ▼
 *   app-ai-analysis (NIETO) ← recibe el resultado como @Input
 */
import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef } from '@angular/core';
import { Match } from '../../models/match.model';
import { AiAnalysisComponent } from '../ai-analysis/ai-analysis';
import { MockGeminiService, GeminiAnalysis } from '../../services/mock-gemini.service';

@Component({
  selector: 'app-match-card',
  standalone: true,
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

  // ─── Inyección del servicio mock ────────────────────────────────────────────
  /**
   * inject() — Inyección de dependencias moderna (Angular 14+).
   * Angular crea la instancia de MockGeminiService y la provee aquí.
   * Como es providedIn: 'root', es un Singleton: todas las tarjetas
   * comparten la misma instancia del servicio.
   */
  private geminiService = inject(MockGeminiService);

  /**
   * ChangeDetectorRef — necesario porque delay() de RxJS usa setTimeout()
   * internamente, que corre FUERA del NgZone de Angular.
   * Sin detectChanges(), Angular no re-renderiza hasta el próximo evento
   * del usuario (por eso había que hacer click para que apareciera).
   */
  private cdr = inject(ChangeDetectorRef);

  // ─── Estado del análisis IA ─────────────────────────────────────────────────

  /**
   * isAnalyzing — Controla el spinner de carga en el botón.
   * true  → muestra "Analizando..." con spinner animado
   * false → muestra el texto normal del botón
   *
   * Se pone en true al hacer click y vuelve a false cuando llega la respuesta.
   */
  isAnalyzing: boolean = false;

  /**
   * analysis — Almacena la respuesta del MockGeminiService.
   * null    → aún no se pidió el análisis (panel no abierto todavía)
   * objeto  → análisis listo para mostrar en app-ai-analysis
   *
   * GeminiAnalysis | null usa Union Type de TypeScript: puede ser uno u otro.
   */
  analysis: GeminiAnalysis | null = null;

  // ─── GETTERS — propiedades calculadas ──────────────────────────────────────

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

  /**
   * buttonLabel — Texto dinámico del botón de análisis IA.
   *
   * Cambia según el estado del partido para que la acción tenga sentido:
   *   - upcoming / live → "Analizar previa con IA"  (predicción futura)
   *   - finished        → "Ver resumen táctico"     (análisis del resultado)
   *
   * Es un getter porque se recalcula automáticamente cuando isFinished cambia.
   */
  get buttonLabel(): string {
    return this.isFinished
      ? '📊 Ver resumen táctico de la IA'
      : '✨ Analizar previa con IA';
  }

  // ─── MÉTODO: requestAnalysis ────────────────────────────────────────────────

  /**
   * requestAnalysis() — Gestiona el ciclo completo de análisis IA.
   *
   * FLUJO PASO A PASO:
   *
   * 1. Si ya hay un análisis guardado → simplemente alterna el panel (sin HTTP)
   *    Esto evita llamar al servicio múltiples veces para el mismo partido.
   *
   * 2. Si no hay análisis previo:
   *    a. isAnalyzing = true  → el template muestra el spinner
   *    b. toggleAnalysis.emit() → avisa al padre que abra el panel
   *    c. geminiService.analyzeMatch() → lanza el Observable
   *    d. .subscribe(next) → después de 1500ms recibe GeminiAnalysis
   *    e. this.analysis = result → guarda el resultado
   *    f. isAnalyzing = false → oculta el spinner
   *
   * ¿Por qué emitir toggleAnalysis ANTES de tener la respuesta?
   * Para que el panel se abra de inmediato mostrando el spinner,
   * en lugar de aparecer 1.5 segundos después. Mejor UX.
   */
  requestAnalysis(): void {
    if (this.analysis) {
      // Ya tenemos el análisis: solo toggle el panel, sin nueva petición
      this.toggleAnalysis.emit();
      return;
    }

    // Sin análisis previo: iniciamos la petición
    this.isAnalyzing = true;
    this.toggleAnalysis.emit(); // abre el panel inmediatamente (mostrará spinner)

    this.geminiService
      .analyzeMatch(this.match)  // pasamos el Match completo (con status y goles)
      .subscribe({
        /**
         * next: se ejecuta cuando el Observable emite el valor
         * (después del delay de 1500ms).
         * "result" es el GeminiAnalysis construido en el servicio.
         */
        next: (result: GeminiAnalysis) => {
          this.analysis    = result;
          this.isAnalyzing = false;
          // Fuerza re-render inmediato aunque delay() corrió fuera del NgZone
          this.cdr.detectChanges();
        },

        error: (err) => {
          console.error('[MatchCard] Error en análisis IA:', err);
          this.isAnalyzing = false;
          this.cdr.detectChanges();
        },
      });
  }
}

