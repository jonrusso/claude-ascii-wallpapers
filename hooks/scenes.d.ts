export type Wallpaper = {
  id: string
  name: string
  label: string
  alt: string
  /** How the app frosts its panels over this wallpaper, tinted to its mood. */
  glass: { blur: number; tint: string; opacity: number }
  build: () => string
  /** A small moving version for the picker. */
  mini: () => string
}

export const WALLPAPERS: readonly Wallpaper[]
export const OFF: { id: 'off'; name: string; label: string }
export function sceneOf(id: string): string | undefined
export function thumbOf(id: string, isSelected: boolean): string
