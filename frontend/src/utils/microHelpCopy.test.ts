import { MICRO_HELP } from './microHelpCopy';

describe('microHelpCopy', () => {
  it('exposes contextual micro-help strings from spec', () => {
    expect(MICRO_HELP.WARDROBE_ONLY).toBe('Only recommend items from your saved wardrobe.');
    expect(MICRO_HELP.MODEL_PREVIEW).toBe('Creates a visual preview of the suggested outfit.');
    expect(MICRO_HELP.INSIGHTS).toBe(
      'Find missing items that would unlock more outfit combinations.'
    );
  });
});
