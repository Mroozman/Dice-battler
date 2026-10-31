import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-title-screen',
  templateUrl: './title-screen.html',
  styleUrl: './title-screen.css',
})
export class TitleScreen {
  readonly start = output<void>();

  private readonly _starting = signal(false);
  readonly starting = this._starting.asReadonly();

  onStartClick(): void {
    if (this._starting()) {
      return;
    }
    this._starting.set(true);
    this.start.emit();
  }
}
