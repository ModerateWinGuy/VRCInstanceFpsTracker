"use client"

import { useMemo, useState, useCallback, memo } from "react"
import {
  CartesianGrid,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
} from "recharts"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Users } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"
import type { AverageFpsChartProps, ChartDataPoint, TrendDataPoint, ChartDomain, CustomTooltipProps } from "@/lib/types"

// Define the window size for the running average (in milliseconds)
const DEFAULT_WINDOW_SIZE: number = 30 * 1000 // 30 seconds
// Define the default smoothing factor (higher = smoother)
const DEFAULT_SMOOTHING_FACTOR: number = 6

// Format the time for display - moved outside component to prevent recreation
const formatTime = (timestamp: any): string => {
  if (!timestamp) return ""
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  } catch (error) {
    console.error("Error formatting time:", error)
    return ""
  }
}

// Memoize the CustomTooltip component to prevent unnecessary re-renders
const CustomTooltip = memo(({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length > 0) {
    const time: string | number | Date = payload[0]?.payload?.time || payload[0]?.payload?.x

    return (
      <div className="bg-background border rounded-md shadow-md p-3">
        <p className="text-sm font-medium">{formatTime(time)}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry, index) => {
            // Handle player count data
            if (entry.dataKey === "y" && entry.name === "Player Count") {
              return (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f97316" }} />
                  <span className="text-sm">Players: {entry.value}</span>
                </div>
              )
            }

            // Handle FPS data
            if (entry.name === "Average FPS" && entry.value) {
              const data = entry.payload
              return (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm">Average: {entry.value.toFixed(1)} FPS</span>
                  {data.rawY !== undefined && data.rawY !== data.y && (
                    <span className="text-xs text-muted-foreground">(raw: {data.rawY.toFixed(1)})</span>
                  )}
                </div>
              )
            }

            // Handle trend line
            if (entry.name === "Trend" && entry.value) {
              return (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#10b981", borderStyle: "dashed" }} />
                  <span className="text-sm">Trend: {entry.value.toFixed(1)} FPS</span>
                </div>
              )
            }

            return null
          })}

          {payload[0]?.payload?.pointCount && (
            <div className="text-xs text-muted-foreground">Data points: {payload[0].payload.pointCount}</div>
          )}
          {payload[0]?.payload?.playerCount && payload[0]?.payload?.players && (
            <div className="text-xs text-muted-foreground">Players: {payload[0].payload.playerCount}</div>
          )}
        </div>
      </div>
    )
  }
  return null
})

CustomTooltip.displayName = "CustomTooltip"

export function AverageFpsChart({ players, getPlayerData, playerCountData }: AverageFpsChartProps) {
  const [trendLineVisible, setTrendLineVisible] = useState<boolean>(true)
  const [windowSize, setWindowSize] = useState<number>(DEFAULT_WINDOW_SIZE)
  const [showReferenceLines, setShowReferenceLines] = useState<boolean>(true)
  const [smoothingFactor, setSmoothingFactor] = useState<number>(DEFAULT_SMOOTHING_FACTOR)
  const [playerCountVisible, setPlayerCountVisible] = useState<boolean>(true)

  // Debounce inputs to reduce calculations
  const debouncedPlayers = useDebounce(players, 100)
  const debouncedWindowSize = useDebounce(windowSize, 300)
  const debouncedSmoothingFactor = useDebounce(smoothingFactor, 300)
  const debouncedPlayerCountData = useDebounce(playerCountData, 100)

  // Process data to calculate running average FPS across all players
  const { averageData, trendData, domain, allPoints, processedPlayerCountData, maxPlayerCount } = useMemo(() => {
    if (debouncedPlayers.length === 0) {
      return {
        averageData: [],
        trendData: [],
        domain: { x: [0, 1], y: [0, 60] },
        allPoints: [],
        processedPlayerCountData: [],
        maxPlayerCount: 0,
      }
    }

    // Step 1: Collect all data points from all players
    const allDataPoints: ChartDataPoint[] = []

    debouncedPlayers.forEach((player) => {
      try {
        const { data } = getPlayerData(player.name)

        if (data && Array.isArray(data)) {
          data.forEach((point) => {
            if (point && typeof point.time === "string" && typeof point.fps === "number") {
              allDataPoints.push({
                timestamp: new Date(point.time).getTime(),
                time: point.time,
                fps: point.fps,
                player: player.name,
                x: new Date(point.time).getTime(),
                y: point.fps,
              })
            }
          })
        }
      } catch (error) {
        console.error(`Error processing data for player ${player.name}:`, error)
      }
    })

    // Process player count data
    let maxPlayerCount = 0
    const processedPlayerCountData: ChartDataPoint[] = debouncedPlayerCountData.map((point) => {
      const timestamp: number = new Date(point.time).getTime()
      maxPlayerCount = Math.max(maxPlayerCount, point.count)

      return {
        x: timestamp,
        y: point.count,
        time: point.time,
        count: point.count,
      }
    })

    // Sort all points by timestamp
    allDataPoints.sort((a, b) => a.x - b.x)

    if (allDataPoints.length === 0) {
      return {
        averageData: [],
        trendData: [],
        domain: { x: [0, 1], y: [0, 60] },
        allPoints: [],
        processedPlayerCountData,
        maxPlayerCount,
      }
    }

    // Step 2: Calculate running average at regular intervals
    const startTime: number = allDataPoints[0].x
    const endTime: number = allDataPoints[allDataPoints.length - 1].x

    // Create time points at regular intervals
    const interval: number = Math.min(debouncedWindowSize / 4, 2000) // Quarter window size or 2 seconds, whichever is smaller
    const timePoints: number[] = []

    // Optimize by reducing the number of time points for large datasets
    const timeRangeValue = endTime - startTime
    const maxTimePoints = 200 // Limit the number of points to improve performance
    const step = Math.max(interval, Math.floor(timeRangeValue / maxTimePoints))

    for (let time = startTime; time <= endTime; time += step) {
      timePoints.push(time)
    }

    // Calculate running average at each time point
    let runningAverages: (ChartDataPoint | undefined)[] = timePoints
      .map((centerTime) => {
        try {
          // Find all points within the window
          const windowStart: number = centerTime - debouncedWindowSize / 2
          const windowEnd: number = centerTime + debouncedWindowSize / 2

          const pointsInWindow: ChartDataPoint[] = allDataPoints.filter(
            (point) => point.x >= windowStart && point.x <= windowEnd && typeof point.fps === "number",
          )

          if (pointsInWindow.length === 0) {
            return undefined
          }

          // Calculate average FPS
          const totalFps: number = pointsInWindow.reduce((sum, point) => sum + (point.fps ?? 0), 0)
          const avgFps: number = totalFps / pointsInWindow.length

          // Get unique players in this window
          const playersInWindow: string[] = [
            ...new Set(
              pointsInWindow.map((p) => p.player).filter((player): player is string => typeof player === "string"),
            ),
          ]

          return {
            x: centerTime,
            y: avgFps,
            time: new Date(centerTime).toISOString(),
            fps: avgFps,
            playerCount: playersInWindow.length,
            players: playersInWindow.join(", "),
            pointCount: pointsInWindow.length,
            rawY: avgFps, // Store the original value for reference
          }
        } catch (error) {
          console.error("Error calculating running average:", error)
          return undefined
        }
      })
      .filter((point): point is NonNullable<typeof point> => point !== undefined)

    // Apply smoothing using a rolling average
    if (runningAverages.length > 0 && debouncedSmoothingFactor > 0) {
      const smoothedAverages: ChartDataPoint[] = [...runningAverages] as ChartDataPoint[]
      const windowRadius: number = Math.floor(debouncedSmoothingFactor)

      for (let i = 0; i < runningAverages.length; i++) {
        let sum = 0
        let count = 0

        // Calculate weighted average of surrounding points
        for (let j = Math.max(0, i - windowRadius); j <= Math.min(runningAverages.length - 1, i + windowRadius); j++) {
          // Apply weight based on distance (closer points have more influence)
          const distance: number = Math.abs(i - j)
          const weight: number = 1 / (distance + 1)
          const point = runningAverages[j]
          if (point && typeof point.rawY === "number") {
            sum += point.rawY * weight
            count += weight
          }
        }

        // Update the point with smoothed value
        if (count > 0) {
          smoothedAverages[i] = {
            ...smoothedAverages[i],
            y: sum / count,
            fps: sum / count,
          }
        }
      }

      runningAverages = smoothedAverages
    }

    // Step 3: Calculate trend line
    let trendPoints: TrendDataPoint[] = []

    if (runningAverages.length >= 2) {
      try {
        // Simple linear regression
        const n: number = runningAverages.length
        let sumX = 0
        let sumY = 0
        let sumXY = 0
        let sumXX = 0

        runningAverages.forEach((point) => {
          if (point) {
            sumX += point.x
            sumY += point.y
            sumXY += point.x * point.y
            sumXX += point.x * point.x
          }
        })

        const denominator: number = n * sumXX - sumX * sumX

        if (denominator !== 0) {
          const slope: number = (n * sumXY - sumX * sumY) / denominator
          const intercept: number = (sumY - slope * sumX) / n

          // Create trend line points
          const validAverages: ChartDataPoint[] = runningAverages.filter(
            (point): point is ChartDataPoint => point !== null && point !== undefined,
          )
          if (validAverages.length >= 2) {
            const firstX: number = validAverages[0].x
            const lastX: number = validAverages[validAverages.length - 1].x

            trendPoints = [
              {
                x: firstX,
                y: slope * firstX + intercept,
                time: validAverages[0].time,
              },
              {
                x: lastX,
                y: slope * lastX + intercept,
                time: validAverages[validAverages.length - 1].time,
              },
            ]
          }
        }
      } catch (error) {
        console.error("Error calculating trend line:", error)
      }
    }

    // Calculate domain with padding
    let minTime: number = Number.POSITIVE_INFINITY
    let maxTime: number = Number.NEGATIVE_INFINITY
    let minFps: number = Number.POSITIVE_INFINITY
    let maxFps: number = Number.NEGATIVE_INFINITY

    runningAverages.forEach((point) => {
      if (point) {
        minTime = Math.min(minTime, point.x)
        maxTime = Math.max(maxTime, point.x)
        minFps = Math.min(minFps, point.y)
        maxFps = Math.max(maxFps, point.y)
      }
    })

    // Update time domain to include player count data if available
    if (processedPlayerCountData.length > 0) {
      processedPlayerCountData.forEach((point) => {
        minTime = Math.min(minTime, point.x)
        maxTime = Math.max(maxTime, point.x)
      })
    }

    // Handle case where there's no valid data
    if (!isFinite(minTime) || !isFinite(maxTime)) {
      return {
        averageData: [],
        trendData: [],
        domain: { x: [0, 1], y: [0, 60] },
        allPoints: [],
        processedPlayerCountData,
        maxPlayerCount,
      }
    }

    // Add padding
    const timeRange: number = maxTime - minTime
    const fpsRange: number = maxFps - minFps || 10 // Prevent zero range

    return {
      averageData: runningAverages,
      trendData: trendPoints,
      domain: {
        x: [minTime - timeRange * 0.02, maxTime + timeRange * 0.02],
        y: [Math.max(0, minFps - fpsRange * 0.1), maxFps + fpsRange * 0.1],
      } as ChartDomain,
      allPoints: allDataPoints,
      processedPlayerCountData,
      maxPlayerCount,
    }
  }, [debouncedPlayers, getPlayerData, debouncedWindowSize, debouncedSmoothingFactor, debouncedPlayerCountData])

  // Toggle trend line visibility with useCallback
  const toggleTrendLine = useCallback((): void => {
    setTrendLineVisible((prev) => !prev)
  }, [])

  // Toggle reference lines with useCallback
  const toggleReferenceLines = useCallback((): void => {
    setShowReferenceLines((prev) => !prev)
  }, [])

  // Toggle player count visibility with useCallback
  const togglePlayerCount = useCallback((): void => {
    setPlayerCountVisible((prev) => !prev)
  }, [])

  // Change window size with useCallback
  const changeWindowSize = useCallback((newSize: number): void => {
    setWindowSize(newSize)
  }, [])

  // Handle smoothing factor changes with useCallback
  const handleSmoothingChange = useCallback((value: number[]): void => {
    setSmoothingFactor(value[0])
  }, [])

  // Calculate reference lines - memoized
  const referenceLines = useMemo<number[]>(() => {
    return [45, 30, 15].filter((fps) => {
      // Only show reference lines that are within the domain
      return fps >= domain.y[0] && fps <= domain.y[1]
    })
  }, [domain.y])

  if (players.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border rounded-lg p-6">
        <p className="text-muted-foreground">Select players to display average FPS data</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chart container with fixed height */}
      <div className="h-[450px]" style={{ minHeight: "450px", flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              dataKey="x"
              name="Time"
              domain={domain.x}
              tickFormatter={formatTime}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="FPS"
              domain={domain.y}
              label={{ value: "Average FPS", angle: -90, position: "insideLeft" }}
              tickCount={10}
              tickFormatter={(value) => value.toFixed(1)}
              yAxisId="fps"
            />
            {processedPlayerCountData.length > 0 && (
              <YAxis
                type="number"
                dataKey="y"
                name="Players"
                domain={[0, maxPlayerCount * 1.1]}
                label={{ value: "Players", angle: 90, position: "insideRight" }}
                orientation="right"
                yAxisId="players"
                tickCount={5}
              />
            )}
            <ZAxis range={[60, 60]} />
            <Tooltip content={<CustomTooltip />} />

            {/* Reference lines */}
            {showReferenceLines &&
              referenceLines.map((fps) => (
                <ReferenceLine
                  key={fps}
                  y={fps}
                  stroke="#9ca3af"
                  strokeDasharray="3 3"
                  label={{
                    value: `${fps} FPS`,
                    position: "right",
                    fill: "#9ca3af",
                    fontSize: 12,
                  }}
                  yAxisId="fps"
                />
              ))}

            {/* Average FPS data */}
            {averageData.length > 0 && (
              <Scatter
                name="Average FPS"
                data={averageData}
                fill="#10b981" // emerald-500
                line={{ stroke: "#10b981", strokeWidth: 2 }}
                lineType="joint"
                shape="circle"
                yAxisId="fps"
              />
            )}

            {/* Trend line */}
            {trendLineVisible && trendData.length > 0 && (
              <Scatter
                name="Trend"
                data={trendData}
                fill="none"
                line={{
                  stroke: "#10b981",
                  strokeWidth: 1.5,
                  strokeDasharray: "5 5",
                }}
                lineType="fitting"
                shape="cross"
                yAxisId="fps"
              />
            )}

            {/* Player count data */}
            {processedPlayerCountData.length > 0 && playerCountVisible && (
              <Scatter
                name="Player Count"
                data={processedPlayerCountData}
                fill="#f97316" // orange-500
                line={{ stroke: "#f97316", strokeWidth: 2 }}
                lineType="joint"
                shape="circle"
                yAxisId="players"
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col items-center gap-3">
        {/* Window size controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Window Size:</span>
          <div className="flex gap-1">
            {[10, 30, 60, 120].map((seconds) => (
              <Button
                key={seconds}
                variant={windowSize === seconds * 1000 ? "default" : "outline"}
                size="sm"
                onClick={() => changeWindowSize(seconds * 1000)}
                className="px-2 py-1 h-8"
              >
                {seconds}s
              </Button>
            ))}
          </div>
        </div>

        {/* Smoothing slider */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm font-medium">Smoothing:</span>
          <div className="w-40">
            <Slider value={[smoothingFactor]} min={0} max={10} step={1} onValueChange={handleSmoothingChange} />
          </div>
          <span className="text-xs text-muted-foreground ml-2">{smoothingFactor}</span>
        </div>

        {/* Button controls */}
        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="outline" size="sm" onClick={toggleTrendLine} className="flex items-center gap-2">
            {trendLineVisible ? (
              <>
                <TrendingDown className="h-4 w-4" />
                Hide Trend
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Show Trend
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={toggleReferenceLines} className="flex items-center gap-2">
            {showReferenceLines ? "Hide Reference Lines" : "Show Reference Lines"}
          </Button>

          {processedPlayerCountData.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayerCount}
              className={cn("flex items-center gap-2", playerCountVisible ? "bg-orange-100" : "")}
            >
              <Users className="h-4 w-4" />
              {playerCountVisible ? "Hide Player Count" : "Show Player Count"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
