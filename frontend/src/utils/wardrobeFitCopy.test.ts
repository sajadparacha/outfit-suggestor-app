import {
  DEFAULT_FIT_GOAL,
  WARDROBE_FIT_COPY,
  wardrobeFitVerdictLabel,
} from './wardrobeFitCopy';

describe('wardrobeFitCopy', () => {
  it('maps verdicts to shared labels', () => {
    expect(wardrobeFitVerdictLabel('strong_fit')).toBe('Strong fit');
    expect(wardrobeFitVerdictLabel('weak_fit')).toBe('Weak fit');
    expect(wardrobeFitVerdictLabel('redundant')).toBe('Already covered');
  });

  it('exposes action and error copy from the spec', () => {
    expect(WARDROBE_FIT_COPY.action).toBe('How this fits');
    expect(WARDROBE_FIT_COPY.error).toBe('Couldn’t evaluate this piece. Try again.');
    expect(WARDROBE_FIT_COPY.loading).toBe(
      'Checking how this works with your wardrobe…'
    );
  });

  it('defaults goal to smart-casual / work+everyday / classic', () => {
    expect(DEFAULT_FIT_GOAL).toEqual({
      dress_code: 'smart-casual',
      lifestyle_mix: ['work', 'everyday'],
      primary_lifestyle: 'work',
      style_primary: 'classic',
      text_input: '',
    });
  });
});
