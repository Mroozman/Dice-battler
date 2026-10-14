import { chooseRewardAction } from './greedy-reward-policy';
import type { DieDef, DieId } from '../model/die';

function makeDie(id: string, kind: DieDef['kind'], sides: DieDef['sides']): DieDef {
  return { id: id as DieId, sides, kind, label: `D${sides}` };
}

function makeCatalog(dice: readonly DieDef[]): Readonly<Record<DieId, DieDef>> {
  return Object.fromEntries(dice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
}

describe('chooseRewardAction', () => {
  it('swaps the weakest die of the same kind when the reward beats it', () => {
    const weak = makeDie('weak', 'attack', 4);
    const strong = makeDie('strong', 'attack', 8);
    const catalog = makeCatalog([weak, strong]);
    const reward = makeDie('reward', 'attack', 6);

    expect(chooseRewardAction(catalog, reward)).toEqual({ type: 'swap', replacedId: weak.id });
  });

  it('skips when the reward is no better than the weakest die of the same kind', () => {
    const existing = makeDie('existing', 'heal', 8);
    const catalog = makeCatalog([existing]);
    const reward = makeDie('reward', 'heal', 8);

    expect(chooseRewardAction(catalog, reward)).toEqual({ type: 'skip' });
  });

  it('skips when the catalog has no die of the reward kind at all', () => {
    const catalog = makeCatalog([makeDie('a', 'attack', 4)]);
    const reward = makeDie('reward', 'shield', 4);

    expect(chooseRewardAction(catalog, reward)).toEqual({ type: 'skip' });
  });

  it('picks the single weakest candidate among several of the same kind', () => {
    const weakest = makeDie('weakest', 'attack', 4);
    const middle = makeDie('middle', 'attack', 6);
    const strongest = makeDie('strongest', 'attack', 8);
    const catalog = makeCatalog([middle, strongest, weakest]);
    const reward = makeDie('reward', 'attack', 10);

    expect(chooseRewardAction(catalog, reward)).toEqual({ type: 'swap', replacedId: weakest.id });
  });

  it('ignores dice of a different kind when judging whether the reward is better', () => {
    const strongShield = makeDie('shield-strong', 'shield', 12);
    const weakAttack = makeDie('attack-weak', 'attack', 4);
    const catalog = makeCatalog([strongShield, weakAttack]);
    const reward = makeDie('reward', 'attack', 6);

    expect(chooseRewardAction(catalog, reward)).toEqual({ type: 'swap', replacedId: weakAttack.id });
  });
});
