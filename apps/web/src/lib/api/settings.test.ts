import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('svelte/store', () => ({
  get: vi.fn(),
}));

vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('$lib/stores/settings', () => ({
  performanceStore: {
    subscribe: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    updatePerformance: vi.fn(),
    setPerformanceTier: vi.fn(),
    enableAutoPerformanceDetect: vi.fn(),
    setVirtualization: vi.fn(),
    setReduceAnimations: vi.fn(),
    resetToDefaults: vi.fn(),
  },
}));

const { fetchSettings, updateSettings, exportSettings, requestDataExport, requestAccountDeletion } =
  await import('./settings');
const { apiClient } = await import('$lib/api/client');
const { performanceStore } = await import('$lib/stores/settings');

type ApiResponse<T> = { data: T; requestId?: string };

type PatchResponse = ApiResponse<{ success: boolean; settings: Record<string, unknown> }>;
type ExportResponse = ApiResponse<{ settings: Record<string, unknown>; exportedAt: string }>;
type DataExportResponse = ApiResponse<{ success: boolean; requestId: string; message: string }>;

describe('settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSettings', () => {
    const mockApiData = {
      display: {
        theme: 'cyber',
        enableTerminalEffects: true,
        effects: {},
        effectIntensity: {},
        fontSize: 16,
        terminalGlowIntensity: 60,
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        fontSize: 16,
        colorBlindMode: 'none',
        screenReaderAnnouncements: true,
        keyboardNavigationHints: true,
        focusIndicatorStyle: 'subtle',
      },
      gameplay: {
        difficulty: 'normal',
        notificationVolume: 80,
        notificationCategoryVolumes: {},
        notificationDuration: 5,
        autoAdvanceTiming: 0,
        queueBuildupRate: 3,
      },
      audio: {
        masterVolume: 80,
        categoryVolumes: {},
        muteAll: false,
        textToSpeechEnabled: false,
        textToSpeechSpeed: 100,
      },
      account: { displayName: 'TestUser', privacyMode: 'public' },
    };

    it('calls client.get with correct URL for all settings', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockApiData });
      vi.mocked(get).mockReturnValue({
        tier: 'medium' as const,
        userOverride: false,
        autoDetect: true,
        enableVirtualization: true,
        reduceAnimations: false,
      });

      await fetchSettings();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings/all');
    });

    it('calls client.get with correct URL for category-specific settings', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockApiData });
      vi.mocked(get).mockReturnValue({
        tier: 'medium' as const,
        userOverride: false,
        autoDetect: true,
        enableVirtualization: true,
        reduceAnimations: false,
      });

      await fetchSettings('display');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings/display');
    });

    it('calls client.get with correct URL for accessibility category', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockApiData });
      vi.mocked(get).mockReturnValue({
        tier: 'medium' as const,
        userOverride: false,
        autoDetect: true,
        enableVirtualization: true,
        reduceAnimations: false,
      });

      await fetchSettings('accessibility');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings/accessibility');
    });

    it('calls client.get with correct URL for audio category', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockApiData });
      vi.mocked(get).mockReturnValue({
        tier: 'medium' as const,
        userOverride: false,
        autoDetect: true,
        enableVirtualization: true,
        reduceAnimations: false,
      });

      await fetchSettings('audio');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings/audio');
    });

    it('includes performance from performanceStore in result', async () => {
      const mockPerformance = {
        tier: 'high' as const,
        userOverride: true,
        autoDetect: false,
        enableVirtualization: true,
        reduceAnimations: false,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockApiData });
      vi.mocked(get).mockReturnValue(mockPerformance);

      const result = await fetchSettings();

      expect(result.performance).toEqual(mockPerformance);
    });

    it('gets performance from performanceStore using svelte store get', async () => {
      const mockPerformance = {
        tier: 'low' as const,
        userOverride: false,
        autoDetect: true,
        enableVirtualization: false,
        reduceAnimations: true,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockApiData });
      vi.mocked(get).mockReturnValue(mockPerformance);

      await fetchSettings();

      expect(get).toHaveBeenCalledWith(performanceStore);
    });
  });

  describe('updateSettings', () => {
    it('calls client.patch with correct URL and body for display settings', async () => {
      const mockResponse: PatchResponse = { data: { success: true, settings: {} } };
      vi.mocked(apiClient.patch).mockResolvedValue(mockResponse);

      await updateSettings('display', { theme: 'green' });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/settings/display', { theme: 'green' });
    });

    it('calls client.patch with correct URL and body for accessibility settings', async () => {
      const mockResponse: PatchResponse = { data: { success: true, settings: {} } };
      vi.mocked(apiClient.patch).mockResolvedValue(mockResponse);

      await updateSettings('accessibility', { reducedMotion: true });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/settings/accessibility', {
        reducedMotion: true,
      });
    });

    it('calls client.patch with correct URL and body for gameplay settings', async () => {
      const mockResponse: PatchResponse = { data: { success: true, settings: {} } };
      vi.mocked(apiClient.patch).mockResolvedValue(mockResponse);

      await updateSettings('gameplay', { difficulty: 'hard' });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/settings/gameplay', {
        difficulty: 'hard',
      });
    });

    it('calls client.patch with correct URL and body for audio settings', async () => {
      const mockResponse: PatchResponse = { data: { success: true, settings: {} } };
      vi.mocked(apiClient.patch).mockResolvedValue(mockResponse);

      await updateSettings('audio', { masterVolume: 50 });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/settings/audio', { masterVolume: 50 });
    });

    it('returns the API response from client.patch', async () => {
      const mockResponse: PatchResponse & { requestId: string } = {
        data: { success: true, settings: {} },
        requestId: 'req-123',
      };
      vi.mocked(apiClient.patch).mockResolvedValue(mockResponse);

      const result = await updateSettings('display', { theme: 'green' });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('exportSettings', () => {
    it('calls client.get with export endpoint URL', async () => {
      const mockResponse: ExportResponse = { data: { settings: {}, exportedAt: '2024-01-01' } };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await exportSettings();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/settings/export');
    });

    it('returns the API response from client.get', async () => {
      const mockResponse: ExportResponse & { requestId: string } = {
        data: { settings: {}, exportedAt: '2024-01-01' },
        requestId: 'req-456',
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await exportSettings();

      expect(result).toEqual(mockResponse);
    });
  });

  describe('requestDataExport', () => {
    it('calls client.post with data-export endpoint URL', async () => {
      const mockResponse: DataExportResponse = {
        data: { success: true, requestId: 'export-123', message: 'Requested' },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await requestDataExport();

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/settings/account/data-export', {});
    });

    it('returns the API response from client.post', async () => {
      const mockResponse: DataExportResponse & { requestId: string } = {
        data: { success: true, requestId: 'export-123', message: 'Requested' },
        requestId: 'req-789',
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await requestDataExport();

      expect(result).toEqual(mockResponse);
    });
  });

  describe('requestAccountDeletion', () => {
    it('calls client.post with delete endpoint URL', async () => {
      const mockResponse: DataExportResponse = {
        data: { success: true, requestId: 'delete-456', message: 'Deleted' },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await requestAccountDeletion();

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/settings/account/delete', {});
    });

    it('returns the API response from client.post', async () => {
      const mockResponse: DataExportResponse & { requestId: string } = {
        data: { success: true, requestId: 'delete-456', message: 'Deleted' },
        requestId: 'req-abc',
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await requestAccountDeletion();

      expect(result).toEqual(mockResponse);
    });
  });
});
