import type { PlayerDataPoint } from "@/lib/types"

interface TrendPoint {
  time: string
  fps: number
}

interface DataPoint {
  x: number
  y: number
  originalTime: string
}

/**
 * Calculates a linear trend line for FPS data
 * @param data Array of {time, fps} data points
 * @returns Array of trend line data points
 */
export function calculateTrendLine(data: PlayerDataPoint[]): TrendPoint[] {
  if (!data || data.length < 2) return []

  // Convert timestamps to numeric values (milliseconds since epoch)
  const points: DataPoint[] = data.map((point) => ({
    x: new Date(point.time).getTime(),
    y: point.fps,
    originalTime: point.time, // Keep the original time format
  }))

  // Calculate linear regression
  const n: number = points.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0

  for (const point of points) {
    sumX += point.x
    sumY += point.y
    sumXY += point.x * point.y
    sumXX += point.x * point.x
  }

  // Calculate slope and y-intercept
  const denominator: number = n * sumXX - sumX * sumX

  // Avoid division by zero
  if (denominator === 0) return []

  const slope: number = (n * sumXY - sumX * sumY) / denominator
  const intercept: number = (sumY - slope * sumX) / n

  // Use the actual first and last data points from the original dataset
  // This ensures the trend line spans the entire data range
  return [
    {
      // Use the exact same time format as the original data point
      time: points[0].originalTime,
      fps: slope * points[0].x + intercept,
    },
    {
      // Use the exact same time format as the original data point
      time: points[points.length - 1].originalTime,
      fps: slope * points[points.length - 1].x + intercept,
    },
  ]
}
