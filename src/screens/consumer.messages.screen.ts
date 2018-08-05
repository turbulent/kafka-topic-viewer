import * as blessed from 'blessed';
import * as blessedContrib from 'blessed-contrib';
import { Screen } from '../screen';

interface Properties {
  maxMessages: number;
  maxLogEntries: number;
  onMessageSelect?: (i: number) => void;
  messages: string[];
  logs: string[];
  menuOptions: object;
}

export class ConsumerMessagesScreen extends Screen {

  public props: Properties;

  public menu?: any;
  public msgLogGrid?: any;
  public logList?: any;
  public msgList?: any;
  public bigbox?: any;

  constructor(props: Properties) {
    super();
    this.props = props;
    this.setup();
    this.updateProps(this.props);
  }

  updateProps(props: Properties): void {
    this.props = props;
    this.msgList.setItems(this.props.messages);
    this.msgList.scrollTo(this.msgList.items.length);

    this.logList.setItems(this.props.logs);
    this.logList.scrollTo(this.logList.items.length);
    this.render();
  }

  setup = (): void => {

    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'Consumer Inspector >> Message Log',
    });

    this.screen.key(['C-c'], (_ch, _key) => {
      return process.exit(0);
    });

    this.msgLogGrid = new blessedContrib.grid({
      rows: 14,
      cols: 12,
      screen: this.screen,
    });

    this.menu = this.msgLogGrid.set(0, 0, 2, 12, blessed.listbar, this.props.menuOptions);

    this.msgList = this.msgLogGrid.set(2, 4, 12, 8, blessed.list, {
      label: 'Message Log',
      scrollable: true,
      alwaysScroll: true,
      interactive: true,
      mouse: true,
      keys: true,
      style: {
        selected: { fg: 'white', bg: 'blue' },
        item: { fg: 'green' },
      },
    });

    this.bigbox = this.msgLogGrid.set(8, 0, 6, 4, blessed.bigtext, {
      content: 'ABCD',
      label: 'Partition Offset',
    });

    this.logList = this.msgLogGrid.set(2, 0, 6, 4, blessedContrib.log, {
      bufferLength: this.props.maxLogEntries,
      fg: 'green',
      selectedFg: 'green',
      label: 'Client Log',
    });

    this.msgList.on('select', this.onItemSelect);
    this.msgList.focus();
  }

  onItemSelect = (_list, selected) => {
    this.props.onMessageSelect && this.props.onMessageSelect(selected);
  }
}
