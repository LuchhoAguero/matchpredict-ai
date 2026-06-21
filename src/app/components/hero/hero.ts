import { Component } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.html',
})
export class HeroComponent {

  scrollToMatches(): void {
    document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollDown(): void {
    window.scrollTo({
      top: window.innerHeight * 0.8,
      behavior: 'smooth',
    });
  }
}
