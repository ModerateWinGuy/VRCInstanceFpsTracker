/**
 * Parses a log file to extract FPS data
 * @param content The content of the log file
 * @param prefix The prefix to filter log entries
 * @returns Parsed log data with entries and player list
 */
export function parseLogFile(content: string, prefix: string) {
  // Split the content into lines
  const lines = content.split(/\r?\n/)

  // Filter lines that match the prefix
  const fpsLines = lines.filter((line) => line.includes(prefix))

  // Parse each line to extract time, player name, and FPS
  const entries = fpsLines
    .map((line) => {
      // Try to match the user's updated format:
      // 2025.04.04 23:42:13 Debug      -  [MWG_FPS] ModerateWinGuy FPS: 45
      const userFormatRegex = /(\d{4}\.\d{2}\.\d{2}\s\d{2}:\d{2}:\d{2}).*?\[([^\]]+)\]\s+(\S+)\s+FPS:\s+(\d+)/
      const userMatch = line.match(userFormatRegex)

      if (userMatch) {
        const [, timestamp, logPrefix, player, fps] = userMatch

        // Only process if the log prefix matches the specified prefix
        if (logPrefix === prefix.replace(/[[\]]/g, "")) {
          return {
            time: timestamp.trim(),
            player: player.trim(),
            fps: Number.parseInt(fps, 10),
          }
        }
      }

      return null
    })
    .filter(Boolean) as { time: string; player: string; fps: number }[]

  // Extract unique player names
  const players = [...new Set(entries.map((entry) => entry.player))]

  return {
    entries,
    players,
  }
}

