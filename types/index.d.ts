/** A wallpaper's id (`coffee-farm`, `just-create`), or `off`. */
export type WallpaperChoice = string

/** Which tab of the picker tray is open. */
export type WallpaperTab = 'wallpapers' | 'themes'

declare module 'claude-code' {
  interface PluginState {
    'ascii-wallpapers': {
      choice: WallpaperChoice
      tab: WallpaperTab
      /** The first thumbnail showing in the picker's one scrolling line. */
      offset: number
    }
  }
}
