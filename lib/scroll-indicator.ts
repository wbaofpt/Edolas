export type ScrollIndicatorInput = {
  scrollY: number;
  scrollHeight: number;
  viewportHeight: number;
  trackHeight: number;
  minThumbHeight?: number;
};

export type ScrollIndicatorMetrics = {
  scrollable: boolean;
  thumbHeight: number;
  thumbOffset: number;
};

export function getScrollIndicatorMetrics({
  scrollY,
  scrollHeight,
  viewportHeight,
  trackHeight,
  minThumbHeight = 44
}: ScrollIndicatorInput): ScrollIndicatorMetrics {
  const safeTrackHeight = Math.max(trackHeight, 0);
  const maxScroll = Math.max(scrollHeight - viewportHeight, 0);

  if (maxScroll === 0 || safeTrackHeight === 0) {
    return {
      scrollable: false,
      thumbHeight: safeTrackHeight,
      thumbOffset: 0
    };
  }

  const viewportRatio = Math.min(Math.max(viewportHeight / scrollHeight, 0), 1);
  const thumbHeight = Math.min(safeTrackHeight, Math.max(minThumbHeight, safeTrackHeight * viewportRatio));
  const scrollProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);

  return {
    scrollable: true,
    thumbHeight,
    thumbOffset: (safeTrackHeight - thumbHeight) * scrollProgress
  };
}
