"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FpsChart } from "@/components/fps-chart"
import { AverageFpsChart } from "@/components/average-fps-chart"
import { LogUploader } from "@/components/log-uploader"
import { parseLogFile } from "@/lib/log-parser"
import { PlayerSelector } from "@/components/player-selector"
import { calculateTrendLine } from "@/lib/trend-calculator"

export default function Home() {
  const [logData, setLogData] = useState(null)
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [prefix, setPrefix] = useState("MWG_FPS")

  const handleFileProcessed = (data) => {
    const processedData = parseLogFile(data, prefix)
    setLogData(processedData)

    // Auto-select first player if available
    if (processedData.players.length > 0) {
      setSelectedPlayers([processedData.players[0]])
    }
  }

  const getPlayerData = (playerName) => {
    if (!logData) return { data: [], trend: [] }

    const playerData = logData.entries
      .filter((entry) => entry.player === playerName)
      .map((entry) => ({
        time: entry.time,
        fps: entry.fps,
      }))

    const trendData = calculateTrendLine(playerData)

    return {
      data: playerData,
      trend: trendData,
    }
  }

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
              <div className="flex items-center gap-4">
                <label htmlFor="prefix" className="text-sm font-medium">
                  Log Prefix:
                </label>
                <input
                  id="prefix"
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter log prefix"
                />
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
                  players={logData.players}
                  selectedPlayers={selectedPlayers}
                  onSelectionChange={setSelectedPlayers}
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
                      <FpsChart players={selectedPlayers} getPlayerData={getPlayerData} />
                    </div>
                  </TabsContent>
                  <TabsContent value="average" className="pt-4">
                    <div className="h-[600px] flex flex-col">
                      <AverageFpsChart players={selectedPlayers} getPlayerData={getPlayerData} />
                    </div>
                  </TabsContent>
                  <TabsContent value="stats" className="pt-4">
                    <div className="grid gap-4">
                      {selectedPlayers.map((player) => {
                        const playerData = getPlayerData(player).data
                        const avgFps = playerData.reduce((sum, entry) => sum + entry.fps, 0) / playerData.length
                        const minFps = Math.min(...playerData.map((entry) => entry.fps))
                        const maxFps = Math.max(...playerData.map((entry) => entry.fps))

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
                      })}
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

