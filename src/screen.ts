import * as blessed from 'blessed';
import { EventEmitter } from 'events';

export abstract class Screen extends EventEmitter {
  public screen!: blessed.Widgets.Screen;

  abstract updateProps(props): void;

  public render = (): void => {
    this.screen.render();
  }

  public close = (): void => {
    this.emit('closed');
  }

  public destroy = (): void => {
    this.screen.destroy();
  }
}
