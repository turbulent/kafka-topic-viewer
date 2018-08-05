import * as blessed from 'blessed';
import * as blessedContrib from 'blessed-contrib';
import { Screen } from '../screen';
import { DataTable, COLOR_HOVER, Message } from '../dashboard';

interface Properties {
  currentOffset: number;
  maxMessages: number;
  maxLogEntries: number;
  onMessageSelect?: (i: number) => void;
  messages: Message[];
  logs: string[];
  menuOptions: object;
  info: DataTable;
}

export class ConsumerMessagesScreen extends Screen {

  public props!: Properties;

  public menu?: any;
  public msgLogGrid?: any;
  public logList?: any;
  public msgList?: any;
  public table?: any;
  public state: { offsets: number[] } = { offsets: [] };

  constructor() {
    super();
  }

  updateProps(props: Properties): void {
    this.props = props;

    this.msgList.label = 'Messages';

    this.logList.setItems(this.props.logs);
    this.logList.scrollTo(this.logList.items.length);

    const offsets = this.props.messages.map(m => m.offset);
    const diff = offsets.filter(o => this.state.offsets.indexOf(o) < 0);

    if (diff.length > 0) {
      this.msgList.setData([
        ['Offset', 'Value'],
        ...this.props.messages.map(m => ([ m.offset, m.value ])),
      ]);
      this.msgList.scrollTo(this.msgList.rows.length);
      this.state.offsets = offsets;
    }

    this.table.setData([
      this.props.info.headers,
      ...this.props.info.data,
    ]);

    this.render();
  }

  setup(props: Properties): void {

    this.props = props;
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'Consumer >> Messages',
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

    this.msgList = this.msgLogGrid.set(2, 4, 12, 8, blessed.listtable, {
      scrollable: true,
      interactive: true,
      mouse: true,
      keys: true,
      width: 'shrink',
      noCellBorders: true,
      pad: 0,
      data: [
        ['Offset', 'Value'],
      ],
      align: 'left',
      style: {
        header: {
          bg: COLOR_HOVER,
          fg: 'white',
        },
        cell: {
          fg: 'green',
          selected: { fg: 'white', bg: 'blue' },
          hover: { bg: COLOR_HOVER },
        },
      },
    });

    this.table = this.msgLogGrid.set(8, 0, 6, 4, blessed.listtable, {
      scrollable: true,
      interactive: true,
      mouse: true,
      keys: true,
      align: 'left',
      pad: 0,
      style: {
        header: {
          bg: COLOR_HOVER,
          fg: 'white',
        },
        cell: {
          fg: 'green',
          hover: { bg: COLOR_HOVER },
        },
      },
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
