// Entry types
export interface LogData {
    entries: (FpsEntry | PlayerCountEntry)[] | null
    players: string[]
    hasPlayerCount?: boolean
  }
  
  export interface FpsEntry {
    time: string
    player: string
    fps: number
    type: "fps"
  }
  
  export interface PlayerCountEntry {
    time: string
    count: number
    type: "playerCount"
  }
  
  // Data point types
  export interface PlayerDataPoint {
    time: string
    fps: number
  }
  
  export interface PlayerCountDataPoint {
    time: string
    count: number
  }
  
  // Chart data types
  export interface ChartDataPoint {
    x: number
    y: number
    time: string
    player?: string
    count?: number
    playerCount?: number
    players?: string
    pointCount?: number
    rawY?: number
    fps?: number // Add this property
    timestamp?: number // Add this property which is also used
  }
  
  export interface TrendDataPoint {
    x: number
    y: number
    time: string
  }
  
  // Component props types
  export interface Player {
    name: string
  }
  
  export interface PlayerData {
    data: PlayerDataPoint[]
    trend?: PlayerDataPoint[]
  }
  
  export interface AverageFpsChartProps {
    players: Player[]
    getPlayerData: (player: string) => PlayerData
    playerCountData: PlayerCountDataPoint[]
  }
  
  export interface FpsChartProps {
    players: string[]
    getPlayerData: (player: string) => PlayerData
    playerCountData: PlayerCountDataPoint[]
  }
  
  export interface LogUploaderProps {
    onFileProcessed: (content: string) => void
  }
  
  export interface PlayerSelectorProps {
    players: string[]
    selectedPlayers: string[]
    onSelectionChange: (selectedPlayers: string[]) => void
  }
  
  // Legend item type
  export interface LegendItem {
    id: string
    value: string
    color: string
    type: string
    dataKey: string
    visible: boolean
    dashed?: boolean
  }
  
  // Domain type
  export interface ChartDomain {
    x: [number, number]
    y: [number, number]
  }
  
  // Tooltip props
  export interface CustomTooltipProps {
    active?: boolean
    payload?: any[]
    label?: string
  }
  