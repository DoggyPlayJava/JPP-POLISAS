/**
 * ExcoThemeContext
 *
 * Context terpusat untuk warna tema exco.
 * Setiap layout exco (KeusahawananLayout, KebajikanLayout, dll.)
 * membungkus halaman mereka dengan provider ini.
 *
 * Cara penggunaan dalam page:
 *   const { color } = useExcoTheme();
 */
import React, { createContext, useContext } from 'react';

interface ExcoThemeContextType {
  color: string;     // Warna hex utama dari portal_settings
  moduleId: string;  // ID exco: 'keusahawanan', 'kebajikan', dll.
}

const ExcoThemeContext = createContext<ExcoThemeContextType>({
  color: '#1B5E20',  // fallback default
  moduleId: 'unknown',
});

export function ExcoThemeProvider({
  color,
  moduleId,
  children,
}: {
  color: string;
  moduleId: string;
  children: React.ReactNode;
}) {
  return (
    <ExcoThemeContext.Provider value={{ color, moduleId }}>
      {children}
    </ExcoThemeContext.Provider>
  );
}

export function useExcoTheme(): ExcoThemeContextType {
  return useContext(ExcoThemeContext);
}
