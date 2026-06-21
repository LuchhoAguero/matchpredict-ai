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

  @Input() match!: Match;

  /** true si el panel de IA está expandido (lo controla el padre) */
  @Input() isAnalysisOpen: boolean = false;

  @Output() toggleAnalysis = new EventEmitter<void>();

  private geminiService = inject(MockGeminiService);

  // ChangeDetectorRef: fuerza re-render cuando delay() de RxJS corre fuera del NgZone
  private cdr = inject(ChangeDetectorRef);

  isAnalyzing: boolean = false;

  analysis: GeminiAnalysis | null = null;

  get isLive(): boolean {
    return this.match.status === 'live';
  }

  get isFinished(): boolean {
    return this.match.status === 'finished';
  }

  get hasScore(): boolean {
    return this.isLive || this.isFinished;
  }

  get buttonLabel(): string {
    return this.isFinished
      ? '📊 Ver resumen táctico de la IA'
      : '✨ Analizar previa con IA';
  }

  requestAnalysis(): void {
    if (this.analysis) {
      // Ya hay análisis: solo alterna el panel sin nueva petición
      this.toggleAnalysis.emit();
      return;
    }

    this.isAnalyzing = true;
    this.toggleAnalysis.emit();

    this.geminiService
      .analyzeMatch(this.match)
      .subscribe({
        next: (result: GeminiAnalysis) => {
          this.analysis    = result;
          this.isAnalyzing = false;
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
