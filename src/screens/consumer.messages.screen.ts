import * as blessed from 'blessed';
import * as blessedContrib from 'blessed-contrib';
import { Screen } from '../screen';
import { DataTable, COLOR_HOVER } from '../dashboard';

interface Properties {
  currentOffset: number;
  maxMessages: number;
  maxLogEntries: number;
  onMessageSelect?: (i: number) => void;
  messages: string[];
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

  constructor() {
    super();
  }

  updateProps(props: Properties): void {
    this.props = props;
    this.msgList.setItems(this.props.messages);
    this.msgList.scrollTo(this.msgList.items.length);

    this.logList.setItems(this.props.logs);
    this.logList.scrollTo(this.logList.items.length);

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

    this.msgList = this.msgLogGrid.set(2, 4, 12, 8, blessed.list, {
      label: 'Message Log',
      scrollable: true,
      alwaysScroll: true,
      interactive: true,
      mouse: true,
      keys: true,
      style: {
        selected: { fg: 'white', bg: 'blue' },
        item: { fg: 'green', hover: { bg: COLOR_HOVER } },
      },
    });

    // this.table = this.msgLogGrid.set(8, 0, 6, 4, blessedContrib.table, {
    //   keys: false,
    //   fg: 'white',
    //   selectedFg: 'white',
    //   selectedBg: 'blue',
    //   interactive: true,
    //   mouse: true,
    //   label: 'Values',
    //   border: { type: 'line', fg: 'cyan' },
    //   style: {
    //     selected: { fg: 'white', bg: 'blue' },
    //     item: { fg: 'green', hover: { bg: COLOR_HOVER } },
    //   },
    //   columnSpacing: 2,
    //   columnWidth: [ 18, 25 ],
    // });

    this.table = this.msgLogGrid.set(8, 0, 6, 4, blessed.listtable, {
      scrollable: true,
      interactive: true,
      mouse: true,
      keys: true,
      data: [],
      align: 'left',
      style: {
        header: { bg: COLOR_HOVER, fg: 'white' },
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
