"use client"

import { useMemo, useState } from "react"
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
import { AverageFpsChartProps, DataPoint, Player } from "@/lib/types"

// Define the window size for the running average (in milliseconds)
const DEFAULT_WINDOW_SIZE = 30 * 1000 // 30 seconds

export function AverageFpsChart({ players, getPlayerData }: AverageFpsChartProps) {
  // State to track if trend line is visible
  const [trendLineVisible, setTrendLineVisible] = useState(true)
  // State to track the window size for the running average
  const [windowSize, setWindowSize] = useState(DEFAULT_WINDOW_SIZE)
  // State to track if reference lines are visible
  const [showReferenceLines, setShowReferenceLines] = useState(true)

  // Process data to calculate running average FPS across all players
  const { averageData, trendData, domain, allPoints } = useMemo(() => {
    if (players.length === 0) {
      return {
        averageData: [],
        trendData: [],
        domain: { x: [0, 1], y: [0, 60] },
        allPoints: [],
      }
    }

    // Step 1: Collect all data points from all players
    const allDataPoints: DataPoint[] = []

    players.forEach((player) => {
      const { data } = getPlayerData(player.name);

      data.forEach((point) => {
        allDataPoints.push({
          timestamp: new Date(point.time).getTime(),
          time: point.time,
          fps: point.fps,
          player,
        })
      })
    })

    // Sort all points by timestamp
    allDataPoints.sort((a, b) => a.timestamp - b.timestamp);

    if (allDataPoints.length === 0) {
      return {
        averageData: [],
        trendData: [],
        domain: { x: [0, 1], y: [0, 60] },
        allPoints: [],
      }
    }

    // Step 2: Calculate running average at regular intervals
    const startTime = allDataPoints[0].timestamp;
    const endTime = allDataPoints[allDataPoints.length - 1].timestamp;

    // Create time points at regular intervals
    const interval = Math.min(windowSize / 2, 5000); // Half window size or 5 seconds, whichever is smaller
    const timePoints = [];

    for (let time = startTime; time <= endTime; time += interval) {
      timePoints.push(time);
    }

    // Calculate running average at each time point
    const runningAverages = timePoints
      .map((centerTime) => {
        // Find all points within the window
        const windowStart = centerTime - windowSize / 2
        const windowEnd = centerTime + windowSize / 2

        const pointsInWindow = allDataPoints.filter(
          (point) => point.timestamp >= windowStart && point.timestamp <= windowEnd,
        )

        if (pointsInWindow.length === 0) {
          return null;
        }

        // Calculate average FPS
        const totalFps = pointsInWindow.reduce((sum, point) => sum + point.fps, 0);
        const avgFps = totalFps / pointsInWindow.length;

        // Get unique players in this window
        const playersInWindow = [...new Set(pointsInWindow.map((p) => p.player))];

        return {
          x: centerTime,
          y: avgFps,
          time: new Date(centerTime).toISOString(),
          fps: avgFps,
          playerCount: playersInWindow.length,
          players: playersInWindow.join(", "),
          pointCount: pointsInWindow.length,
        }
      })
      .filter(Boolean) // Remove null values

    // Step 3: Calculate trend line
    let trendPoints: { x: number; y: number; time: string }[] = [];

    if (runningAverages.length >= 2) {
      // Simple linear regression
      const n = runningAverages.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;

      runningAverages.forEach((point) => {
        if (point) {
          sumX += point.x;
          sumY += point.y;
          sumXY += point.x * point.y;
          sumXX += point.x * point.x;
        }
      })

      const denominator = n * sumXX - sumX * sumX;

      if (denominator !== 0) {
        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        // Create trend line points
        const validAverages = runningAverages.filter((point) => point !== null);
        const firstX = validAverages[0].x;
        const lastX = validAverages[validAverages.length - 1].x;

        trendPoints = [
          {
            x: firstX,
            y: slope * firstX + intercept,
            time: runningAverages[0] ? runningAverages[0].time : "",
          },
          {
            x: lastX,
            y: slope * lastX + intercept,
            time: runningAverages[runningAverages.length - 1]?.time || "",
          },
        ];
      }
    }

    // Calculate domain with padding
    let minTime = Number.POSITIVE_INFINITY;
    let maxTime = Number.NEGATIVE_INFINITY;
    let minFps = Number.POSITIVE_INFINITY;
    let maxFps = Number.NEGATIVE_INFINITY;

    runningAverages.forEach((point) => {
      if (point) {
        minTime = Math.min(minTime, point.x);      
        maxTime = Math.max(maxTime, point.x);
        minFps = Math.min(minFps, point.y);
        maxFps = Math.max(maxFps, point.y);
      }
    })

    // Add padding
    const timeRange = maxTime - minTime;
    const fpsRange = maxFps - minFps || 10; // Prevent zero range

    return {
      averageData: runningAverages,
      trendData: trendPoints,
      domain: {
        x: [minTime - timeRange * 0.02, maxTime + timeRange * 0.02],
        y: [Math.max(0, minFps - fpsRange * 0.1), maxFps + fpsRange * 0.1],
      },
      allPoints: allDataPoints,
    }
  }, [players, getPlayerData, windowSize])

  // Format the time for display
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  // Toggle trend line visibility
  const toggleTrendLine = () => {
    setTrendLineVisible(!trendLineVisible);
  }

  // Toggle reference lines
  const toggleReferenceLines = () => {
    setShowReferenceLines(!showReferenceLines);
  }

  // Change window size
  const changeWindowSize = (newSize: number) => {
    setWindowSize(newSize);
  }

  if (players.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border rounded-lg p-6">
        <p className="text-muted-foreground">Select players to display average FPS data</p>
      </div>
    )
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="text-sm font-medium">{formatTime(data.x)}</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm">Average: {data.y.toFixed(1)} FPS</span>
            </div>
            <div className="text-xs text-muted-foreground">Window: {(windowSize / 1000).toFixed(0)} seconds</div>
            <div className="text-xs text-muted-foreground">Data points: {data.pointCount}</div>
            <div className="text-xs text-muted-foreground">
              Players: {data.playerCount} ({data.players})
            </div>
          </div>
        </div>
      )
    }
    return null
  }

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
              label={{ value: "Average FPS", angle: -90, position: "insideLeft" }}
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

            {/* Average FPS data */}
            <Scatter
              name="Average FPS"
              data={averageData}
              fill="#10b981" // emerald-500
              line={{ stroke: "#10b981", strokeWidth: 2 }}
              lineType="joint"
              shape="circle"
            />

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
                //shape="none"
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

        {/* Button controls */}
        <div className="flex gap-2">
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
        </div>
      </div>
    </div>
  )
}

