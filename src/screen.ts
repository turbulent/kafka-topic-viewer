import * as blessed from 'blessed';
import { EventEmitter } from 'events';

export abstract class Screen extends EventEmitter {

  public screen!: blessed.Widgets.Screen;
  public props!: object;

  public static screenName: string = 'base';

  public get screenName(): string {
    // tslint:disable-next-line
    return this.constructor['screenName'];
  }

  public render = (): void => {
    this.screen.render();
  }

  public close = (): void => {
    this.emit('closed');
  }

  public destroy = (): void => {
    this.screen.destroy();
  }

  public abstract updateProps(props: object): void;
  public abstract setup(props: object): void;
}
