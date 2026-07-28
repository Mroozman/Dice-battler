import { TestBed } from '@angular/core/testing';
import { BattleLog } from './battle-log';
import type { LogEntry } from '../../domain/model/log';
import type { CombatantId } from '../../domain/model/combatant';

function makeEntry(id: string, tone: LogEntry['tone'], text: string): LogEntry {
  return { id, stageIndex: 0, round: 1, tone, text, actorId: 'player' as CombatantId };
}

describe('BattleLog', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders one entry per log item, with its text', () => {
    const fixture = TestBed.createComponent(BattleLog);
    fixture.componentRef.setInput('entries', [
      makeEntry('1', 'attack', 'Gracz rzuca D6 → 4 obrażeń w Zbir'),
      makeEntry('2', 'heal', 'Gracz rzuca D4 → leczy się o 3'),
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.battle-log-entry');
    expect(items.length).toBe(2);
    expect(items[0].textContent.trim()).toBe('Gracz rzuca D6 → 4 obrażeń w Zbir');
    expect(items[1].textContent.trim()).toBe('Gracz rzuca D4 → leczy się o 3');
  });

  it('applies a tone-specific class to each entry', () => {
    const fixture = TestBed.createComponent(BattleLog);
    fixture.componentRef.setInput('entries', [
      makeEntry('1', 'attack', 'a'),
      makeEntry('2', 'death', 'b'),
      makeEntry('3', 'system', 'c'),
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.battle-log-entry');
    expect(items[0].classList.contains('battle-log-entry--attack')).toBe(true);
    expect(items[1].classList.contains('battle-log-entry--death')).toBe(true);
    expect(items[2].classList.contains('battle-log-entry--system')).toBe(true);
  });

  it('keeps entries in DOM in chronological (input) order — visual newest-first comes from CSS column-reverse, not JS', () => {
    const fixture = TestBed.createComponent(BattleLog);
    fixture.componentRef.setInput('entries', [
      makeEntry('1', 'attack', 'first'),
      makeEntry('2', 'attack', 'second'),
      makeEntry('3', 'attack', 'third'),
    ]);
    fixture.detectChanges();

    const texts = Array.from(fixture.nativeElement.querySelectorAll('.battle-log-entry')).map((el) =>
      (el as HTMLElement).textContent?.trim(),
    );
    expect(texts).toEqual(['first', 'second', 'third']);
  });

  it('marks the log as a polite live region for screen readers', () => {
    const fixture = TestBed.createComponent(BattleLog);
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('.battle-log');
    expect(list.getAttribute('aria-live')).toBe('polite');
  });

  it('renders nothing when there are no entries yet', () => {
    const fixture = TestBed.createComponent(BattleLog);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.battle-log-entry').length).toBe(0);
  });
});
