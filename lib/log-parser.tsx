import { FpsEntry, PlayerCountEntry } from './types';

/**
 * Parses a log file to extract FPS data and player count data
 * @param content The content of the log file
 * @param basePrefix The base prefix to filter log entries (e.g., "MWG_")
 * @returns Parsed log data with entries and player list
 */
export function parseLogFile(content: string, basePrefix: string) {
  // Split the content into lines
  const lines = content.split(/\r?\n/)

  // Create the full prefixes for FPS and player count
  const fpsPrefix = `${basePrefix}FPS`
  const playerCountPrefix = `${basePrefix}PlayerCount`

  // Filter lines that match the FPS prefix
  const fpsLines = lines.filter((line: string | string[]) => line.includes(fpsPrefix))

  // Filter lines that match the player count prefix
  const playerCountLines = lines.filter((line: string | string[]) => line.includes(playerCountPrefix))

  // Parse each FPS line to extract time, player name, and FPS
  const fpsEntries = fpsLines
    .map((line: string) => {
      // Try to match the user's updated format:
      // 2025.04.04 23:42:13 Debug      -  [MWG_FPS] ModerateWinGuy FPS: 45
      const userFormatRegex = /(\d{4}\.\d{2}\.\d{2}\s\d{2}:\d{2}:\d{2}).*?\[([^\]]+)\]\s+(\S+)\s+FPS:\s+(\d+)/
      const userMatch = line.match(userFormatRegex)

      if (userMatch) {
        const [, timestamp, logPrefix, player, fps] = userMatch

        // Only process if the log prefix matches the specified FPS prefix
        if (logPrefix === fpsPrefix.replace(/[[\]]/g, "")) {
          return {
            time: timestamp.trim(),
            player: player.trim(),
            fps: Number.parseInt(fps, 10),
            type: "fps",
          }
        }
      }

      return null
    })
    .filter(Boolean) as FpsEntry[]

  // Parse each player count line to extract time and count
  const playerCountEntries = playerCountLines
    .map((line: string) => {
      // Match format: 2025.04.04 23:42:13 Debug      -  [MWG_PlayerCount] 12
      const countFormatRegex = /(\d{4}\.\d{2}\.\d{2}\s\d{2}:\d{2}:\d{2}).*?\[([^\]]+)\]\s+(\d+)/
      const countMatch = line.match(countFormatRegex)

      if (countMatch) {
        const [, timestamp, logPrefix, count] = countMatch

        // Only process if the log prefix matches the player count prefix
        if (logPrefix === playerCountPrefix.replace(/[[\]]/g, "")) {
          return {
            time: timestamp.trim(),
            count: Number.parseInt(count, 10),
            type: "playerCount",
          }
        }
      }

      return null
    })
    .filter(Boolean) as PlayerCountEntry[]
  // Combine all entries and sort by time
  const allEntries = [...fpsEntries, ...playerCountEntries] as (FpsEntry | PlayerCountEntry)[]
  allEntries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  // Extract unique player names from FPS entries
  const players = [...new Set(fpsEntries.map((entry) => entry.player as string))]

  return {
    entries: allEntries,
    players,
    hasPlayerCount: playerCountEntries.length > 0,
  }
}
