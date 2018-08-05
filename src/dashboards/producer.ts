import { KafkaProducer } from '../producer';
import { Dashboard, TimeStats, DataTable } from '../dashboard';
import { ProducerStatusScreen } from '../screens/producer.status.screen';

interface ScreenProps {
  maxLogEntries: number;
  logs: string[];
  stats: TimeStats;
  info: DataTable;
  menuOptions: object;
}

export class ProducerDashboard extends Dashboard {

  public partitionsOffset: { [x: number]: number } = {};

  public currentOffset: number = 0;
  public lastValue: any;
  public partition: number = 0;

  protected messages: object[] = [];
  protected logs: string[] = [];

  public maxLogEntries = 500;
  public maxMessages = 500;

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
    this.setScreen(ProducerStatusScreen);
  }

  getScreenProps(): ScreenProps {
    return {
      maxLogEntries: this.maxLogEntries,
      logs: this.logs,
      stats: this.stats,
      info: this.getInfoTable(),
      menuOptions: this.getMenuOptions(),
    };
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

  addLog = (line: string): void => {
    if (this.logs.length > 500) {
      this.logs.shift();
    }
    this.logs.push(line);
    this.render();
  }

  onProducerSendError = (err): void => {
    this.addLog(err);
  }

  onProducerLog = (line: string): void => {
    this.addLog(line);
  }

  startUpdating = (): void => {
    this.updating = setInterval(this.updateStats, 1000);
  }

  stopRendering = (): void => {
    this.updating && clearInterval(this.updating);
  }

  render = (): void => {
    this.currentScreen ? this.currentScreen.updateProps(this.getScreenProps()) : undefined;
  }

  updateStats = (): void => {

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
      this.stats.perc = perc;
    }

    this.render();
  }

  getMenuOptions = (): object => {
    return {
      label: 'Producer',
      mouse: true,
      autoCommandKeys: false,
      style: {
        selected: {
          bg: '#304d50',
          bold: true,
        },
        item: {
          bg: '#304d50',
          bold: true,
        },
      },
      items: {
        Status: {
          keys: ['1'],
          callback: () => this.setScreen(ProducerStatusScreen),
        },
        Quit: {
          keys: ['q'],
          callback: () => process.exit(0),
        },
      },
    };
  }

  getInfoTable = (): DataTable => {

    // const partitionMetrics = Object.entries(this.partitionsOffset).map(entry => {
    //   return [ `Partition ${entry[0]}`, entry[1] ];
    // });

    return {
      headers: ['Metric', 'Value'],
      data: [
        ['Mode', 'Producer'],
        ['Kafka Broker', this.producer.kafkaHost ],
        ['Zookeeper', this.producer.zookeeperHost ],
        ['Topic', this.producer.topic],
        ['Partitions', this.producer.partitionsIds.join(',') ],
      ],
    };
  }
}
