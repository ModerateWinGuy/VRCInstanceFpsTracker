export interface LogData {
    entries: { time: string; player: string; fps: number }[] | null;
    players: string[];
}

export interface PlayerDataPoint {
    time: string;
    fps: number;
}

export interface Player {
    name: string;
}

export interface AverageFpsChartProps {
    players: Player[];
    getPlayerData: (player: string) => { data: PlayerDataPoint[] };
}

export interface DataPoint {
    timestamp: number;
    time: string;
    fps: number;
    player: Player;
}