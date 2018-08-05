import * as blessed from 'blessed';
import * as blessedContrib from 'blessed-contrib';
import { Screen } from '../screen';
import { TimeStats, DataTable } from '../dashboard';

interface Properties {
  stats: TimeStats;
  maxLogEntries: number;
  logs: string[];
  info: DataTable;
  menuOptions: object;
}

export class ConsumerStatusScreen extends Screen {

  public screen;
  public menu?: any;
  public lineGraph?: any;
  public grid?: any;
  public infoTable?: any;
  public rateDonug?: any;
  public log?: any;

  constructor(public props: Properties) {
    super();
    this.setup();
  }

  updateProps(props: Properties): void {

    this.props = props;

    const now = Date.now();

    this.log.setItems(this.props.logs);
    this.log.scrollTo(this.log.items.length);

    const { perc, max, cur, entries } = this.props.stats;

    this.rateDonug.setData([{
      percent: perc,
      label: `Max ${max} Cur: ${cur}`,
      color: 'cyan',
    }]);

    const series1 = {
      title: 'msg/s',
      x: entries.slice(-5).map((e) => `-${Math.floor((now - e.time) / 1000)}s`),
      y: entries.slice(-5).map(e => e.messages),
    };
    this.lineGraph.setData([ series1 ]);

    this.infoTable.setData({
      headers: this.props.info.headers,
      data: this.props.info.data,
    });

    this.render();
  }

  setup = (): void => {

    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'Consumer Inspector >> Performance',
    });

    this.screen.key(['C-c'], (_ch, _key) => {
      return process.exit(0);
    });

    this.grid = new blessedContrib.grid({
      rows: 14,
      cols: 12,
      screen: this.screen,
    });

    this.menu = this.grid.set(0, 0, 2, 12, blessed.listbar, this.props.menuOptions);

    // grid.set(row, col, rowSpan, colSpan, obj, opts)
    this.lineGraph = this.grid.set(2, 0, 6, 8, blessedContrib.line, {
      label: 'Message Statistics',
      showLegend: true,
      wholeNumbersOnly: false,
      style: {
        line: 'blue',
        text: 'yellow',
        baseline: 'black',
      },
    });

    this.infoTable = this.grid.set(8, 0, 6, 8, blessedContrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: true,
      label: 'Values',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [ 18, 25 ],
    });

    this.rateDonug = this.grid.set(2, 8, 6, 4, blessedContrib.donut, {
      label: 'Throughtput msg/s',
      radius: 8,
      arcWidth: 3,
      remainColor: 'black',
      yPadding: 2,
      data: [{
        percent: 0,
        label: `Max`,
        color: 'cyan',
      }],
    });

    this.log = this.grid.set(8, 8, 6, 4, blessedContrib.log, {
      bufferLength: this.props.maxLogEntries,
      fg: 'green',
      selectedFg: 'green',
      label: 'Client Log',
    });
  }
}
