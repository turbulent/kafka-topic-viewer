import * as blessed from 'blessed';
import * as blessedContrib from 'blessed-contrib';

import { KafkaProducer } from '../producer';
import { Dashboard, TimeStats } from '../dashboard';

export class ProducerDashboard extends Dashboard {
  public line?: any;
  public grid?: any;
  public table?: any;
  public donut?: any;
  public log?: any;

  public performanceScreen: any;

  public partitionsOffset: { [x: number]: number } = {};
  public updating?: NodeJS.Timer;
  public stats: TimeStats  = {
    time: Date.now(),
    accumulator: 0,
    max: 0,
    cur: 0,
    entries: [],
    perc: 0,
  };

  constructor(public producer: KafkaProducer) {
    super();
    this.producer.on('message', this.onProducerMessage);
    this.producer.on('sendError', this.onProducerSendError);
    this.producer.on('log', this.onProducerLog);

    this.performanceScreen = blessed.screen();
    this.performanceScreen.key(['escape', 'q', 'C-c'], (_chr, _key) => {
      return process.exit(0);
    });

    this.grid = new blessedContrib.grid({
      rows: 12,
      cols: 12,
      screen: this.performanceScreen,
    });

    // grid.set(row, col, rowSpan, colSpan, obj, opts)
    this.line = this.grid.set(0, 0, 6, 8, blessedContrib.line, {
      label: 'Producer statistics',
      showLegend: true,
      wholeNumbersOnly: false,
      style: {
        line: 'blue',
        text: 'yellow',
        baseline: 'black',
      },
    });

    this.table = this.grid.set(6, 0, 6, 8, blessedContrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: true,
      label: 'Values',
      width: '30%',
      height: '30%',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [ 18, 25 ],
    });

    this.donut = this.grid.set(0, 8, 6, 4, blessedContrib.donut, {
      label: 'Throughtput msg/s',
      radius: 8,
      arcWidth: 3,
      remainColor: 'black',
      yPadding: 2,
      data: [{
        percent: 0,
        label: `Max ${this.stats.max}`,
        color: 'cyan',
      }],
    });

    this.log = this.grid.set(6, 8, 6, 4, blessedContrib.log, {
      bufferLength: 100,
      fg: 'green',
      selectedFg: 'green',
      label: 'Log',
    });

    this.performanceScreen.render();
  }

  onProducerMessage = (message): void => {

    if (this.updating === undefined) {
      this.startUpdating();
    }

    const partitions = Object.entries(message[this.producer.topic]);
    const [ partition = 0, offset = 0 ] = partitions[0];
    this.partitionsOffset[partition] = offset;

    this.stats.accumulator++;
  }

  onProducerSendError = (_err): void => {
   //  this.log.log(String(err));
    this.performanceScreen.render();
  }

  onProducerLog = (line: string): void => {
    this.log.log(line);
    this.performanceScreen.render();
  }

  startUpdating = (): void => {
    this.updating = setInterval(this.render, 1000);
  }

  stopRendering = (): void => {
    this.updating && clearInterval(this.updating);
  }

  render = (): void => {
    const now = Date.now();

    if ((now - this.stats.time) >= 1000) {
      this.stats.entries.push({
        time: now,
        messages: this.stats.accumulator,
      });

      this.stats.cur = this.stats.accumulator;
      if (this.stats.accumulator > this.stats.max) {
        this.stats.max = this.stats.accumulator;
      }

      if (this.stats.entries.length > 6) {
        this.stats.entries.shift();
      }
      this.stats.time = now;
      this.stats.accumulator = 0;
    }

    if (this.stats.entries.length > 0 && this.stats.max > 0) {
      const perc = this.stats.entries[this.stats.entries.length - 1].messages * 100 / this.stats.max;
      this.donut.setData([{
        percent: perc,
        label: `Max ${this.stats.max} Cur: ${this.stats.cur}`,
        color: 'cyan',
      }]);
    }

    const series1 = {
      title: 'msg/s',
      x: this.stats
        .entries
        .slice(-5)
        .map((e) => `-${Math.floor((now - e.time) / 1000)}s`),
      y: this.stats
        .entries
        .slice(-5)
        .map(e => e.messages),
    };

    const partitionMetrics = Object.entries(this.partitionsOffset).map(entry => {
      return [ `Partition ${entry[0]}`, entry[1] ];
    });

    this.table.setData({
      headers: ['Metric', 'Value'],
      data: [
        ['Mode', 'Producer'],
        ['Kafka Broker', this.producer.kafkaHost ],
        ['Zookeeper', this.producer.zookeeperHost ],
        ['Topic', this.producer.topic ],
        ['Current Msg/s', this.stats.cur ],
        ['Partitions', this.producer.partitionsIds.join(',') ],
        ...partitionMetrics,
      ],
    });

    this.line.setData([ series1 ]);
    this.performanceScreen.render();
  }
}
