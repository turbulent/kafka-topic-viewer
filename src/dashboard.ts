
export abstract class Dashboard {
  public screen?: any;
  public updating?: NodeJS.Timer;

  startUpdating = (): void => {
    this.updating = setInterval(this.render, 1000);
  }

  stopUpdating = (): void => {
    this.updating && clearInterval(this.updating);
  }

  abstract render: () => void;
}

export interface LineGraphEntry {
  time: number;
  messages: number;
}

export interface TimeStats {
  time: number;
  accumulator: number;
  max: number;
  cur: number;
  entries: LineGraphEntry[];
  perc: number;
}
export interface DataTable {
  headers: string[];
  data: Array<[string|number, string|number]>;
}
