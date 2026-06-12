import { reasoningToBullets } from './reasoningBullets';

describe('reasoningToBullets', () => {
  it('splits newline-separated reasoning', () => {
    expect(
      reasoningToBullets('Classic pairing.\nNeutral tones work well.\nComfortable for summer.')
    ).toEqual(['Classic pairing.', 'Neutral tones work well.', 'Comfortable for summer.']);
  });

  it('splits sentences when no newlines', () => {
    expect(reasoningToBullets('First point. Second point. Third point.')).toEqual([
      'First point.',
      'Second point.',
      'Third point.',
    ]);
  });

  it('returns single bullet for short text', () => {
    expect(reasoningToBullets('One cohesive look.')).toEqual(['One cohesive look.']);
  });

  it('caps at five bullets', () => {
    const bullets = reasoningToBullets(
      'First reason here. Second reason here. Third reason here. Fourth reason here. Fifth reason here. Sixth reason here.'
    );
    expect(bullets).toHaveLength(5);
  });

  it('returns empty for blank input', () => {
    expect(reasoningToBullets('   ')).toEqual([]);
  });
});
