  export interface LogData {
    entries: { time: string; player: string; fps: number }[] | null;
    players: string[];
  }