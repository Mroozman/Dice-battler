import { Component, signal } from '@angular/core';

const TOOLTIP_SELECTOR = '[data-tooltip]';
const TOOLTIP_OFFSET_PX = 8;
const TOOLTIP_HALF_WIDTH_PX = 136;
const TOOLTIP_FLIP_THRESHOLD_PX = 80;

export interface TooltipPosition {
  readonly left: number;
  readonly top: number;
  readonly below: boolean;
}

export function computeTooltipPosition(rect: DOMRect, viewportWidth: number): TooltipPosition {
  const centerX = rect.left + rect.width / 2;
  const maxLeft = Math.max(TOOLTIP_HALF_WIDTH_PX, viewportWidth - TOOLTIP_HALF_WIDTH_PX);
  const left = Math.min(Math.max(centerX, TOOLTIP_HALF_WIDTH_PX), maxLeft);
  const below = rect.top < TOOLTIP_FLIP_THRESHOLD_PX;
  const top = below ? rect.bottom + TOOLTIP_OFFSET_PX : rect.top - TOOLTIP_OFFSET_PX;
  return { left, top, below };
}

@Component({
  selector: 'app-tooltip-host',
  template: `
    @if (text(); as content) {
      <div
        class="tooltip-host"
        [class.tooltip-host--below]="position().below"
        [style.left.px]="position().left"
        [style.top.px]="position().top"
        aria-hidden="true"
      >
        {{ content }}
      </div>
    }
  `,
  styleUrl: './tooltip-host.css',
  host: {
    '(document:mouseover)': 'onPointerOver($event)',
    '(document:mouseout)': 'hide()',
    '(document:focusin)': 'onFocusIn($event)',
    '(document:focusout)': 'hide()',
    '(document:keydown.escape)': 'hide()',
    '(window:scroll)': 'hide()',
  },
})
export class TooltipHost {
  public readonly text = signal<string | null>(null);
  public readonly position = signal<TooltipPosition>({ left: 0, top: 0, below: false });

  public onPointerOver(event: MouseEvent): void {
    this.showFor(event.target);
  }

  public onFocusIn(event: FocusEvent): void {
    this.showFor(event.target);
  }

  public hide(): void {
    this.text.set(null);
  }

  private showFor(target: EventTarget | null): void {
    const anchor = target instanceof Element ? target.closest(TOOLTIP_SELECTOR) : null;
    const content = anchor?.getAttribute('data-tooltip');
    if (!anchor || !content) {
      this.hide();
      return;
    }
    this.position.set(computeTooltipPosition(anchor.getBoundingClientRect(), window.innerWidth));
    this.text.set(content);
  }
}
