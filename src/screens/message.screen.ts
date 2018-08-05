import * as blessed from 'blessed';
import * as blessedContrib from 'blessed-contrib';
import { Screen } from '../screen';
import { MessageDetails } from '../dashboard';

interface Properties {
  messageDetails?: MessageDetails;
}

export class MessageScreen extends Screen {

  public props!: Properties;

  public grid?: any;
  public messageBox?: any;

  constructor() {
    super();
  }

  updateProps(props: Properties): void {
    this.props = props;
    if (this.props.messageDetails) {
      this.messageBox.setItems(this.props.messageDetails.lines);
    }
    this.render();
  }

  setup(props: Properties): void {

    this.props = props;

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
      rows: 14,
      cols: 14,
      screen: this.screen,
    });

    this.messageBox = this.grid.set(0, 0, 14, 14, blessed.list, {
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
