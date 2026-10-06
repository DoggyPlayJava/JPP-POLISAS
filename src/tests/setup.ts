// import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock pdf renderer
vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({
    toBlob: vi.fn().mockResolvedValue(new Blob()),
  })),
  StyleSheet: {
    create: vi.fn((styles) => styles),
  },
  Document: vi.fn(({ children }) => children),
  Page: vi.fn(({ children }) => children),
  View: vi.fn(({ children }) => children),
  Text: vi.fn(({ children }) => children),
  Image: vi.fn(() => null),
  Font: {
    register: vi.fn(),
  },
}));

