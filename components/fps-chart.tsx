"use client"

import { useMemo, useState, useEffect } from "react"
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
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Define the maximum time gap in milliseconds (5 minutes)
const MAX_TIME_GAP = 5 * 60 * 1000

export function FpsChart({ players, getPlayerData }) {
  // State to track which series are visible
  const [visibleSeries, setVisibleSeries] = useState({})
  // State to track if trend lines are visible
  const [trendLinesVisible, setTrendLinesVisible] = useState(true)
  // State to track if reference lines are visible
  const [showReferenceLines, setShowReferenceLines] = useState(true)

  // Initialize visible series when players change
  useEffect(() => {
    const initialState = {}
    players.forEach((player) => {
      initialState[player] = true
      initialState[`${player} (trend)`] = true
    })
    setVisibleSeries(initialState)
  }, [players])

  // Generate a color palette for the players
  const playerColors = useMemo(() => {
    const colors = [
      "#2563eb", // blue-600
      "#dc2626", // red-600
      "#16a34a", // green-600
      "#9333ea", // purple-600
      "#ea580c", // orange-600
      "#0891b2", // cyan-600
      "#4f46e5", // indigo-600
      "#db2777", // pink-600
    ]

    return players.reduce((acc, player, index) => {
      acc[player] = colors[index % colors.length]
      return acc
    }, {})
  }, [players])

  // Process data for all players
  const { allData, domain, trendData } = useMemo(() => {
    // Collect all data points and convert time to timestamps
    const allDataPoints = []
    const allTrendPoints = {}
    let minTime = Number.POSITIVE_INFINITY
    let maxTime = Number.NEGATIVE_INFINITY
    let minFps = Number.POSITIVE_INFINITY
    let maxFps = Number.NEGATIVE_INFINITY

    players.forEach((player) => {
      const { data, trend } = getPlayerData(player)

      // Process player data
      const processedData = data.map((point) => {
        const timestamp = new Date(point.time).getTime()
        minTime = Math.min(minTime, timestamp)
        maxTime = Math.max(maxTime, timestamp)
        minFps = Math.min(minFps, point.fps)
        maxFps = Math.max(maxFps, point.fps)

        return {
          x: timestamp,
          y: point.fps,
          time: point.time,
          player,
        }
      })

      allDataPoints.push(...processedData)

      // Process trend data
      if (trend && trend.length >= 2) {
        const processedTrend = trend.map((point) => {
          const timestamp = new Date(point.time).getTime()
          return {
            x: timestamp,
            y: point.fps,
            time: point.time,
            player: `${player} (trend)`,
          }
        })

        allTrendPoints[player] = processedTrend
      } else {
        allTrendPoints[player] = []
      }
    })

    // Sort all data points by time
    allDataPoints.sort((a, b) => a.x - b.x)

    // Create player-specific datasets
    const playerData = {}
    players.forEach((player) => {
      playerData[player] = allDataPoints.filter((point) => point.player === player)
    })

    // Add some padding to the domains
    const fpsRange = maxFps - minFps || 10 // Prevent zero range
    const timeRange = maxTime - minTime || 3600000 // Default to 1 hour if no range

    return {
      allData: playerData,
      domain: {
        x: [minTime - timeRange * 0.02, maxTime + timeRange * 0.02],
        y: [Math.max(0, minFps - fpsRange * 0.1), maxFps + fpsRange * 0.1],
      },
      trendData: allTrendPoints,
    }
  }, [players, getPlayerData])

  // Format the time for display
  const formatTime = (timestamp) => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  // Handle legend click
  const handleLegendClick = (dataKey) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }))
  }

  // Toggle all trend lines
  const toggleAllTrendLines = () => {
    setTrendLinesVisible(!trendLinesVisible)

    // Update visibility state for all trend lines
    const updatedVisibility = { ...visibleSeries }
    players.forEach((player) => {
      updatedVisibility[`${player} (trend)`] = !trendLinesVisible
    })

    setVisibleSeries(updatedVisibility)
  }

  // Toggle reference lines
  const toggleReferenceLines = () => {
    setShowReferenceLines(!showReferenceLines)
  }

  if (players.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border rounded-lg p-6">
        <p className="text-muted-foreground">Select players to display FPS data</p>
      </div>
    )
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="text-sm font-medium">{formatTime(payload[0].payload.x)}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm">
                  {entry.payload.player}: {entry.value} FPS
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  // Create custom legend items
  const legendItems = []

  players.forEach((player) => {
    // Add player data series
    legendItems.push({
      id: player,
      value: player,
      color: playerColors[player],
      type: "scatter",
      dataKey: player,
      visible: visibleSeries[player] || false,
    })

    // Add trend line
    legendItems.push({
      id: `${player} (trend)`,
      value: `${player} (trend)`,
      color: playerColors[player],
      type: "line",
      dataKey: `${player} (trend)`,
      dashed: true,
      visible: visibleSeries[`${player} (trend)`] || false,
    })
  })

  // Calculate reference line values
  const referenceLines = [45, 30, 15].filter((fps) => {
    // Only show reference lines that are within the domain
    return fps >= domain.y[0] && fps <= domain.y[1]
  })

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
              label={{ value: "FPS", angle: -90, position: "insideLeft" }}
              tickCount={10}
              tickFormatter={(value) => value.toFixed(1)}
            />
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
                />
              ))}

            {/* Player data points */}
            {players.map(
              (player) =>
                visibleSeries[player] &&
                allData[player] &&
                allData[player].length > 0 && (
                  <Scatter
                    key={player}
                    name={player}
                    data={allData[player]}
                    fill={playerColors[player]}
                    line={{ stroke: playerColors[player], strokeWidth: 2 }}
                    lineType="joint"
                    shape="circle"
                  />
                ),
            )}

            {/* Trend lines */}
            {players.map(
              (player) =>
                visibleSeries[`${player} (trend)`] &&
                trendData[player] &&
                trendData[player].length > 0 && (
                  <Scatter
                    key={`${player}-trend`}
                    name={`${player} (trend)`}
                    data={trendData[player]}
                    fill="none"
                    line={{
                      stroke: playerColors[player],
                      strokeWidth: 1.5,
                      strokeDasharray: "5 5",
                    }}
                    lineType="fitting"
                    shape="none"
                  />
                ),
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend controls in a scrollable container */}
      <div className="mt-4 flex flex-col items-center gap-3">
        {/* Button controls */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleAllTrendLines} className="flex items-center gap-2">
            {trendLinesVisible ? (
              <>
                <TrendingDown className="h-4 w-4" />
                Hide All Trend Lines
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Show All Trend Lines
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={toggleReferenceLines} className="flex items-center gap-2">
            {showReferenceLines ? "Hide Reference Lines" : "Show Reference Lines"}
          </Button>
        </div>

        {/* Custom legend in scrollable container */}
        <div className="w-full max-h-[100px] overflow-y-auto mt-2 border-t pt-2">
          <div className="flex flex-wrap justify-center gap-4 px-4">
            {legendItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md transition-colors hover:bg-muted",
                  item.visible ? "opacity-100" : "opacity-50",
                )}
                onClick={() => handleLegendClick(item.dataKey)}
              >
                <span
                  className={cn(
                    "inline-block w-4 h-2 rounded-sm",
                    item.dashed ? "border border-current bg-transparent" : "",
                  )}
                  style={{
                    backgroundColor: item.dashed ? "transparent" : item.color,
                    borderColor: item.color,
                    borderStyle: item.dashed ? "dashed" : "solid",
                  }}
                />
                <span className={cn("text-sm font-medium", !item.visible && "line-through text-muted-foreground")}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

