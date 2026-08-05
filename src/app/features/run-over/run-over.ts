import { Component, input } from '@angular/core';

@Component({
  selector: 'app-run-over',
  templateUrl: './run-over.html',
  styleUrl: './run-over.css',
})
export class RunOver {
  readonly outcome = input.required<'victory' | 'defeat'>();
}
