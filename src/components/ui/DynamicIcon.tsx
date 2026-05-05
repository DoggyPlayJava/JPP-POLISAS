import React, { memo, useState, useEffect } from 'react';

/**
 * DynamicIcon — Lazy-loads a Lucide icon by name.
 *
 * Instead of `import * as LucideIcons from 'lucide-react'` (540KB),
 * this component loads the entire module ONLY when first rendered,
 * keeping it out of the initial critical bundle.
 *
 * Usage:
 *   <DynamicIcon name="Trophy" className="w-5 h-5" />
 */

// Module-level cache — loaded once, shared across all instances
let _iconsModule: Record<string, React.ComponentType<any>> | null = null;
let _loadPromise: Promise<void> | null = null;

function loadIcons(): Promise<void> {
  if (_iconsModule) return Promise.resolve();
  if (!_loadPromise) {
    _loadPromise = import('lucide-react').then((mod) => {
      _iconsModule = mod as any;
    });
  }
  return _loadPromise;
}

interface DynamicIconProps extends React.SVGAttributes<SVGSVGElement> {
  /** The PascalCase name of the Lucide icon, e.g. "Trophy", "HeartHandshake" */
  name: string;
  /** Fallback icon name if the requested icon is not found */
  fallback?: string;
  /** Icon size */
  size?: number | string;
}

function DynamicIconInner({ name, fallback = 'LayoutDashboard', ...props }: DynamicIconProps) {
  const [ready, setReady] = useState(!!_iconsModule);

  useEffect(() => {
    if (!_iconsModule) {
      loadIcons().then(() => setReady(true));
    }
  }, []);

  if (!ready || !_iconsModule) {
    // Render an empty placeholder with same dimensions to prevent layout shift
    return <div className={props.className} style={{ width: props.size, height: props.size }} />;
  }

  const Icon = _iconsModule[name] || _iconsModule[fallback];
  if (!Icon) return null;

  return <Icon {...props} />;
}

export const DynamicIcon = memo(DynamicIconInner);
