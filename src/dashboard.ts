import { Screen } from './screen';

interface ScreenClass {
  new (): Screen;
}

export abstract class Dashboard {
  public updating?: NodeJS.Timer;

  public screenStack: Screen[] = [];

  public get currentScreen(): Screen | undefined {
    if (this.screenStack.length > 0) {
      return this.screenStack[this.screenStack.length - 1 ];
    }
  }

  public destroyCurrentScreen() {
    const current = this.currentScreen;
    if (current) {
      current.destroy();
    }
  }

  public pushScreen(screenClass: ScreenClass): void {
    this.destroyCurrentScreen();
    const screen = new screenClass();
    this.screenStack.push(screen);
    screen.on('closed', () => this.popScreen());
    screen.setup(this.getScreenProps());
    this.render();
  }

  public popScreen(): void {
    const screen = this.screenStack.pop();
    if (screen) {
      screen.destroy();
    }

    const last = this.screenStack.pop();
    if (last) {
      this.pushScreen(last.constructor as ScreenClass);
    }
  }

  public setScreen(screenClass: ScreenClass): void {
    if (this.currentScreen) {
      this.popScreen();
    }
    this.pushScreen(screenClass);
  }

  startUpdating = (): void => {
    this.updating = setInterval(this.render, 1000);
  }

  stopUpdating = (): void => {
    this.updating && clearInterval(this.updating);
  }

  abstract getScreenProps(): object;
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

export interface Message {
  topic: string;
  offset: number;
  value: any;
}

export interface MessageDetails {
  lines: string[];
  message: Message;
}

export const COLOR_HOVER: string = '#076563';
