
export abstract class Dashboard {
  public screen?: any;
  public rendering?: NodeJS.Timer;

  startRendering = (): void => {
    this.rendering = setInterval(this.render, 1000);
  }

  stopRendering = (): void => {
    this.rendering && clearInterval(this.rendering);
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
}
