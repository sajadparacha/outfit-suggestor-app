import { MAIN_FLOW_UX_COPY } from './mainFlowUxCopy';

describe('mainFlowUxCopy', () => {
  it('exposes product promise copy from UX coherence spec', () => {
    expect(MAIN_FLOW_UX_COPY.productPromiseHeadline).toBe("Your personal AI men's stylist");
    expect(MAIN_FLOW_UX_COPY.productPromiseSubline).toBe(
      'Upload a piece, get a complete look — then build your wardrobe and plan your week.'
    );
  });

  it('keeps empty preview copy unchanged', () => {
    expect(MAIN_FLOW_UX_COPY.emptyPreviewHeadline).toBe('Your outfit appears here');
    expect(MAIN_FLOW_UX_COPY.emptyPreviewSubline).toBe(
      'Upload a photo, set preferences, then tap Generate Outfit'
    );
  });
});
