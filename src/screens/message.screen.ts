import * as blessed from 'blessed';
import * as blessedContrib from 'blessed-contrib';
import { Screen } from '../screen';

interface Properties {
  messageDetails?: string[];
}

export class MessageScreen extends Screen {

  public props: Properties;

  public grid?: any;
  public messageBox?: any;

  constructor(props: Properties) {
    super();
    this.props = props;
    this.setup();
    this.updateProps(this.props);
  }

  updateProps(props: Properties): void {
    this.props = props;
    if (this.props.messageDetails) {
      this.messageBox.setItems(this.props.messageDetails);
    }
    this.render();
  }

  setup = (): void => {

    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'Consumer Inspector >> Message Details',
    });

    this.screen.key(['C-c'], (_ch, _key) => {
      process.exit(0);
    });

    this.screen.key(['escape'], (_ch, _key) => {
      this.close();
    });

    this.grid = new blessedContrib.grid({
      rows: 1,
      cols: 1,
      screen: this.screen,
    });

    this.messageBox = this.grid.set(0, 0, 1, 1, blessed.list, {
      label: 'Message Details',
      scrollable: true,
      alwaysScroll: true,
      interactive: true,
      keys: true,
      style: {
        selected: { fg: 'white', bg: 'blue' },
        item: { fg: 'green' },
      },
    });

    this.messageBox.focus();
  }
}
