import { stageShadeClass } from './stage-shade';

describe('stageShadeClass', () => {
  it.each([
    [0, 'stage-shade--0'],
    [1, 'stage-shade--1'],
    [2, 'stage-shade--2'],
  ] as const)('maps group stage index %i to %s', (index, expected) => {
    expect(stageShadeClass(index, 'group')).toBe(expected);
  });

  it('maps any boss stage to stage-shade--boss, regardless of index', () => {
    expect(stageShadeClass(3, 'boss')).toBe('stage-shade--boss');
    expect(stageShadeClass(7, 'boss')).toBe('stage-shade--boss');
  });

  it('clamps a group index beyond the known range instead of generating an unknown class', () => {
    expect(stageShadeClass(5, 'group')).toBe('stage-shade--2');
  });
});
