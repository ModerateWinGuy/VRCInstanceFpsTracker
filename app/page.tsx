"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FpsChart } from "@/components/fps-chart"
import { AverageFpsChart } from "@/components/average-fps-chart"
import { LogUploader } from "@/components/log-uploader"
import { parseLogFile } from "@/lib/log-parser"
import { PlayerSelector } from "@/components/player-selector"
import { calculateTrendLine } from "@/lib/trend-calculator"
import { useDebounce } from "@/hooks/use-debounce"
import type {
  LogData,
  FpsEntry,
  PlayerCountEntry,
  PlayerDataPoint,
  PlayerCountDataPoint,
  PlayerData,
} from "@/lib/types"

export default function Home() {
  const [logData, setLogData] = useState<LogData | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [prefix, setPrefix] = useState<string>("MWG_")

  // Debounce selected players to prevent frequent recalculations
  const debouncedSelectedPlayers = useDebounce(selectedPlayers, 100)

  const handleFileProcessed = useCallback(
    (data: string): void => {
      try {
        const processedData: LogData = parseLogFile(data, prefix)
        setLogData(processedData)

        // Auto-select first player if available
        if (processedData.players.length > 0) {
          setSelectedPlayers([processedData.players[0]])
        }
      } catch (error) {
        console.error("Error processing log file:", error)
      }
    },
    [prefix],
  )

  // Memoize the getPlayerData function to prevent unnecessary recalculations
  const getPlayerData = useCallback(
    (playerName: string): PlayerData => {
      if (!logData || !logData.entries) return { data: [], trend: [] }

      try {
        const playerData: PlayerDataPoint[] = logData.entries
          .filter((entry) => entry.type === "fps" && (entry as FpsEntry).player === playerName)
          .map((entry) => ({
            time: entry.time,
            fps: (entry as FpsEntry).fps,
          }))

        const trendData: PlayerDataPoint[] = calculateTrendLine(playerData)

        return {
          data: playerData,
          trend: trendData,
        }
      } catch (error) {
        console.error(`Error getting data for player ${playerName}:`, error)
        return { data: [], trend: [] }
      }
    },
    [logData],
  )

  // Extract player count data from log entries
  const playerCountData = useMemo<PlayerCountDataPoint[]>(() => {
    if (!logData || !logData.entries) return []

    try {
      return logData.entries
        .filter((entry) => entry.type === "playerCount")
        .map((entry) => ({
          time: entry.time,
          count: (entry as PlayerCountEntry).count,
        }))
    } catch (error) {
      console.error("Error extracting player count data:", error)
      return []
    }
  }, [logData])

  // Handle player selection changes
  const handlePlayerSelectionChange = useCallback((players: string[]): void => {
    setSelectedPlayers(players)
  }, [])

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">VRChat Instance FPS Tracker</h1>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload Log File</CardTitle>
            <CardDescription>
              Upload your game log file to visualize FPS data, it can be found at
              C:\Users\username\AppData\LocalLow\VRChat\VRChat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="prefix" className="text-sm font-medium">
                  Base Log Prefix:
                </label>
                <input
                  id="prefix"
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter base prefix (e.g., MWG_)"
                />
                <p className="text-xs text-muted-foreground">
                  The system will automatically look for both {prefix}FPS and {prefix}PlayerCount logs
                </p>
              </div>
              <LogUploader onFileProcessed={handleFileProcessed} />
            </div>
          </CardContent>
        </Card>

        {logData && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Player Selection</CardTitle>
                <CardDescription>Select players to display in the chart</CardDescription>
              </CardHeader>
              <CardContent>
                <PlayerSelector
                  players={logData.players || []}
                  selectedPlayers={selectedPlayers}
                  onSelectionChange={handlePlayerSelectionChange}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FPS Performance</CardTitle>
                <CardDescription>FPS over time with trend lines</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="individual" className="w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="individual">Individual</TabsTrigger>
                    <TabsTrigger value="average">Average</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                  </TabsList>
                  <TabsContent value="individual" className="pt-4">
                    <div className="h-[600px] flex flex-col">
                      <FpsChart
                        players={debouncedSelectedPlayers}
                        getPlayerData={getPlayerData}
                        playerCountData={playerCountData}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="average" className="pt-4">
                    <div className="h-[600px] flex flex-col">
                      <AverageFpsChart
                        players={debouncedSelectedPlayers.map((p) => ({ name: p }))}
                        getPlayerData={getPlayerData}
                        playerCountData={playerCountData}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="stats" className="pt-4">
                    <div className="grid gap-4">
                      {debouncedSelectedPlayers.map((player) => {
                        try {
                          const playerData: PlayerDataPoint[] = getPlayerData(player).data
                          if (playerData.length === 0) {
                            return (
                              <div key={player} className="p-4 border rounded-lg">
                                <h3 className="font-bold text-lg mb-2">{player}</h3>
                                <p className="text-muted-foreground">No data available</p>
                              </div>
                            )
                          }

                          const avgFps: number =
                            playerData.reduce((sum, entry) => sum + entry.fps, 0) / playerData.length
                          const minFps: number = Math.min(...playerData.map((entry) => entry.fps))
                          const maxFps: number = Math.max(...playerData.map((entry) => entry.fps))

                          return (
                            <div key={player} className="p-4 border rounded-lg">
                              <h3 className="font-bold text-lg mb-2">{player}</h3>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Average FPS</p>
                                  <p className="text-2xl font-bold">{avgFps.toFixed(1)}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Min FPS</p>
                                  <p className="text-2xl font-bold">{minFps}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Max FPS</p>
                                  <p className="text-2xl font-bold">{maxFps}</p>
                                </div>
                              </div>
                            </div>
                          )
                        } catch (error) {
                          console.error(`Error rendering stats for player ${player}:`, error)
                          return (
                            <div key={player} className="p-4 border rounded-lg">
                              <h3 className="font-bold text-lg mb-2">{player}</h3>
                              <p className="text-red-500">Error loading data</p>
                            </div>
                          )
                        }
                      })}

                      {/* Player count stats */}
                      {playerCountData.length > 0 && (
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-bold text-lg mb-2">Player Count</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Average Players</p>
                              <p className="text-2xl font-bold">
                                {(
                                  playerCountData.reduce((sum, entry) => sum + entry.count, 0) / playerCountData.length
                                ).toFixed(1)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Min Players</p>
                              <p className="text-2xl font-bold">
                                {Math.min(...playerCountData.map((entry) => entry.count))}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Max Players</p>
                              <p className="text-2xl font-bold">
                                {Math.max(...playerCountData.map((entry) => entry.count))}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}
