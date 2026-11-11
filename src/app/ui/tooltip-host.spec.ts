import { TestBed } from '@angular/core/testing';
import { TooltipHost, computeTooltipPosition } from './tooltip-host';

function makeRect(left: number, top: number, width = 40, height = 20): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top } as DOMRect;
}

describe('computeTooltipPosition', () => {
  it('centers above the anchor', () => {
    expect(computeTooltipPosition(makeRect(500, 300), 1200)).toEqual({ left: 520, top: 292, below: false });
  });

  it('flips below when there is no room above', () => {
    expect(computeTooltipPosition(makeRect(500, 20), 1200)).toEqual({ left: 520, top: 48, below: true });
  });

  it('keeps the tooltip inside the viewport horizontally', () => {
    expect(computeTooltipPosition(makeRect(0, 300), 1200).left).toBe(136);
    expect(computeTooltipPosition(makeRect(1190, 300), 1200).left).toBe(1064);
  });
});

describe('TooltipHost', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('shows the tooltip of the hovered element and hides it on leave', () => {
    const fixture = TestBed.createComponent(TooltipHost);
    const anchor = document.createElement('button');
    anchor.setAttribute('data-tooltip', 'Podpowiedź');
    const inner = document.createElement('span');
    anchor.appendChild(inner);
    document.body.appendChild(anchor);

    fixture.componentInstance.onPointerOver({ target: inner } as unknown as MouseEvent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tooltip-host')?.textContent?.trim()).toBe('Podpowiedź');

    fixture.componentInstance.hide();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tooltip-host')).toBeNull();
    anchor.remove();
  });

  it('shows on keyboard focus and ignores elements without a tooltip', () => {
    const fixture = TestBed.createComponent(TooltipHost);
    const withTip = document.createElement('li');
    withTip.setAttribute('data-tooltip', 'Siła');
    const without = document.createElement('div');

    fixture.componentInstance.onFocusIn({ target: withTip } as unknown as FocusEvent);
    expect(fixture.componentInstance.text()).toBe('Siła');

    fixture.componentInstance.onFocusIn({ target: without } as unknown as FocusEvent);
    expect(fixture.componentInstance.text()).toBeNull();
  });
});
