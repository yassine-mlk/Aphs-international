import { describe, it, expect } from 'vitest';
import { useVideoConference } from '@/hooks/useVideoConference';

describe('useVideoConference Module', () => {
  it('should export useVideoConference function', () => {
    expect(typeof useVideoConference).toBe('function');
  });

  it('should be importable without errors', async () => {
    const module = await import('@/hooks/useVideoConference');
    expect(module).toHaveProperty('useVideoConference');
  });
});
