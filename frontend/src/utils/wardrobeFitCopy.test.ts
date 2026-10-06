import {
  DEFAULT_FIT_GOAL,
  WARDROBE_FIT_COPY,
  WARDROBE_FIT_LAST_GOAL_KEY,
  loadInitialFitGoal,
  saveLastFitGoal,
  wardrobeFitGoalHint,
  wardrobeFitPairCountLabel,
  wardrobeFitVerdictLabel,
} from './wardrobeFitCopy';

describe('wardrobeFitCopy', () => {
  afterEach(() => localStorage.clear());

  it('formats pair counts with units', () => {
    expect(wardrobeFitPairCountLabel(3)).toBe('Pairs with 3');
    expect(wardrobeFitPairCountLabel(1)).toBe('Pairs with 1');
  });

  it('formats the goal hint', () => {
    expect(wardrobeFitGoalHint(DEFAULT_FIT_GOAL)).toBe(
      'Goal: smart-casual · work + everyday · classic'
    );
  });

  it('initial goal falls back to defaults with no saved prefs', () => {
    expect(loadInitialFitGoal()).toEqual(DEFAULT_FIT_GOAL);
  });

  it('initial goal uses Insights prefs, then last-used goal wins', () => {
    localStorage.setItem(
      'insights_lifestyle_preferences',
      JSON.stringify({
        lifestyleMix: ['social'],
        primaryLifestyle: 'social',
        dressCodes: ['casual', 'formal'],
        stylePrimaries: ['streetwear'],
      })
    );
    expect(loadInitialFitGoal()).toEqual({
      dress_code: 'casual',
      lifestyle_mix: ['social'],
      primary_lifestyle: 'social',
      style_primary: 'streetwear',
      text_input: '',
    });

    const last = { ...DEFAULT_FIT_GOAL, dress_code: 'formal', lifestyle_mix: ['formal'], primary_lifestyle: 'formal' };
    saveLastFitGoal(last);
    expect(localStorage.getItem(WARDROBE_FIT_LAST_GOAL_KEY)).not.toBeNull();
    expect(loadInitialFitGoal()).toEqual(last);
  });

  it('ignores a corrupt last-used goal', () => {
    localStorage.setItem(WARDROBE_FIT_LAST_GOAL_KEY, '{bad');
    expect(loadInitialFitGoal()).toEqual(DEFAULT_FIT_GOAL);
  });

  it('maps verdicts to shared labels', () => {
    expect(wardrobeFitVerdictLabel('strong_fit')).toBe('Strong fit');
    expect(wardrobeFitVerdictLabel('weak_fit')).toBe('Weak fit');
    expect(wardrobeFitVerdictLabel('redundant')).toBe('Already covered');
  });

  it('guide copy matches the current fit check', () => {
    expect(WARDROBE_FIT_COPY.guideStep).toContain('Strong fit, Weak fit, or Already covered');
    expect(WARDROBE_FIT_COPY.guideStep).toContain('last fit check, then your Insights preferences');
    expect(WARDROBE_FIT_COPY.guideStep).toContain('ranked by AI');
    expect(WARDROBE_FIT_COPY.guideStep).toContain('view it full screen');
    expect(WARDROBE_FIT_COPY.guideStep).toContain('View all (N)');
    expect(WARDROBE_FIT_COPY.guideStep).toContain('Show less');
    expect(WARDROBE_FIT_COPY.checkBeforeBuyGuideStep).toContain(
      'once a photo is added, Check before you buy appears under Generate Outfit'
    );
    expect(WARDROBE_FIT_COPY.checkBeforeBuyGuideStep).toContain('Add to wardrobe');
    expect(WARDROBE_FIT_COPY.checkBeforeBuyGuideStep).toContain('View all (N)');
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
