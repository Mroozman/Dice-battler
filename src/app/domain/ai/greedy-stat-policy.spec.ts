import { chooseStatIncrease } from './greedy-stat-policy';

describe('chooseStatIncrease', () => {
  it('invests in vitality when below half hp', () => {
    expect(chooseStatIncrease(9, 20)).toBe('vitality');
  });

  it('invests in strength at or above half hp', () => {
    expect(chooseStatIncrease(10, 20)).toBe('strength');
    expect(chooseStatIncrease(20, 20)).toBe('strength');
  });
});
