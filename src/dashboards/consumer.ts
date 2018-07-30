import * as blessed from 'blessed';
import * as blessedContrib from 'blessed-contrib';

import { KafkaConsumer } from '../consumer';
import { Dashboard, TimeStats } from '../dashboard';

export class ConsumerDashboard extends Dashboard {

  public line?: any;
  public grid?: any;
  public table?: any;
  public donut?: any;
  public log?: any;
  public currentOffset: number = 0;
  public lastValue: any;
  public partition: number = 0;

  public stats: TimeStats = {
    time: Date.now(),
    accumulator: 0,
    max: 0,
    cur: 0,
    entries: [],
  };

  constructor(public consumer: KafkaConsumer) {
    super();
    this.consumer.on('message', this.onConsumerMessage);
    this.consumer.on('log', this.onConsumerLog);

    this.screen = blessed.screen();
    this.screen.key(['escape', 'q', 'C-c'], (_chr, _key) => {
      return process.exit(0);
    });

    this.grid = new blessedContrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
    });

    // grid.set(row, col, rowSpan, colSpan, obj, opts)
    this.line = this.grid.set(0, 0, 6, 8, blessedContrib.line, {
      label: 'Consumer statistics',
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
      bufferLength: 5,
      fg: 'green',
      selectedFg: 'green',
      label: 'Log',
    });
  }

  onConsumerMessage = (message): void => {
    if (this.rendering === undefined) {
      this.startRendering();
    }

    this.stats.accumulator++;
    this.currentOffset = message.highWaterOffset;
    this.lastValue = message.value;
    this.partition = message.partition;
  }

  onConsumerError = (err): void => {
    this.log.log(err);
  }

  onConsumerLog = (line: string): void => {
    this.log.log(line);
  }

  startRendering = (): void => {
    this.rendering = setInterval(this.render, 1000);
  }

  stopRendering = (): void => {
    this.rendering && clearInterval(this.rendering);
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
      x: this.stats.entries.slice(-5).map((e) => `-${Math.floor((now - e.time) / 1000)}s`),
      y: this.stats.entries.slice(-5).map(e => e.messages),
    };

    this.table.setData({
      headers: ['Metric', 'Value'],
      data: [
        ['Mode', 'Consumer'],
        ['Kafka Broker', this.consumer.kafkaHost ],
        ['Zookeeper', this.consumer.zookeeperHost ],
        ['Consumer Group', this.consumer.consumerGroup ],
        ['Topic', this.consumer.topic],
        ['Partition', this.partition ],
        ['Partition Offset', this.currentOffset ],
        ['Member Id', this.consumer.memberId ? this.consumer.memberId : 'N/A' ],
      ],
    });

    this.line.setData([ series1 ]);
    this.screen.render();
  }
}
