import { KafkaConsumer } from '../consumer';
import { Dashboard, TimeStats, DataTable } from '../dashboard';
import { ConsumerMessagesScreen } from '../screens/consumer.messages.screen';
import { ConsumerStatusScreen } from '../screens/consumer.performance.screen';
import { MessageScreen } from '../screens/message.screen';
import { inspect } from 'util';

type DashboardMode = 'status' | 'msglog';
type ScreenOption = 'status' | 'msglog' | 'message';

export interface MessageListEntry {
  topic: string;
  value: any;
}

interface ScreenProps {
  maxMessages: number;
  maxLogEntries: number;
  onMessageSelect?: (i: number) => void;
  messages: string[];
  logs: string[];
  messageDetails?: string[];
  stats: TimeStats;
  info: DataTable;
  menuOptions: object;
}

export class ConsumerDashboard extends Dashboard {

  public currentOffset: number = 0;
  public lastValue: any;
  public partition: number = 0;

  protected messages: MessageListEntry[] = [];
  protected logs: string[] = [];

  public maxLogEntries = 500;
  public maxMessages = 500;
  public selectedMessage?: MessageListEntry;

  public stats: TimeStats = {
    time: Date.now(),
    accumulator: 0,
    max: 0,
    cur: 0,
    entries: [],
    perc: 0,
  };

  constructor(public consumer: KafkaConsumer, public mode: DashboardMode) {
    super();
    this.consumer.on('message', this.onConsumerMessage);
    this.consumer.on('log', this.onConsumerLog);
    this.setScreen(this.mode);
  }

  getScreenProps = (): ScreenProps => {
    return {
      maxMessages: this.maxMessages,
      maxLogEntries: this.maxLogEntries,
      onMessageSelect: this.onMessageSelect,
      messages: this.messages.map(m => m.value),
      logs: this.logs,
      messageDetails: this.getMessageDetails(),
      stats: this.stats,
      info: this.getInfoTable(),
      menuOptions: this.getMenuOptions(),
    };
  }

  changeScreen = (screenSelect: ScreenOption): void => {
    this.screen.destroy();
    this.setScreen(screenSelect);
  }

  setScreen = (screenSelect: ScreenOption): void => {
    switch (screenSelect) {
      case 'message':
        this.screen = new MessageScreen(this.getScreenProps());
        break;
      case 'msglog':
        this.screen = new ConsumerMessagesScreen(this.getScreenProps());
        break;
      case 'status':
        this.screen = new ConsumerStatusScreen(this.getScreenProps());
        break;
      default:
        process.exit(2);
    }

    this.screen.on('closed', () => this.changeScreen(this.mode));
  }

  getInfoTable = (): DataTable => {
    return {
      headers: ['Metric', 'Value'],
      data: [
        ['Mode', 'Consumer'],
        ['Kafka Broker', this.consumer.kafkaHost ],
        ['Zookeeper', this.consumer.zookeeperHost ],
        ['Consumer Group', this.consumer.consumerGroup ],
        ['Topic', this.consumer.topic],
        ['Partition', this.partition ],
        ['Partition Offset', this.currentOffset ],
      ],
    };
  }

  getMessageDetails = (): string[] => {
    if (!this.selectedMessage) {
      return [];
    }

    const { value } = this.selectedMessage;
    const dumped = inspect(JSON.parse(value), true, 5, true);
    // tslint:disable-next-line
    return dumped.split("\n");
  }

  onMessageSelect = (index: number): void => {
    this.selectedMessage = this.messages[index];
    this.changeScreen('message');
  }

  addMessage = (entry: MessageListEntry): void => {
    if (this.messages.length > 500) {
      this.messages.shift();
    }
    this.messages.push(entry);
    this.render();
  }

  addLog = (line: string): void => {
    if (this.logs.length > 500) {
      this.logs.shift();
    }
    this.logs.push(line);
    this.render();
  }

  onConsumerMessage = (message): void => {
    if (this.updating === undefined) {
      this.startUpdating();
    }

    this.stats.accumulator++;
    this.currentOffset = message.highWaterOffset;
    this.lastValue = message.value;
    this.partition = message.partition;

    this.addMessage(message);
  }

  onConsumerError = (err): void => {
    this.addLog(err);
  }

  onConsumerLog = (line: string): void => {
    this.addLog(line);
  }

  startUpdating = (): void => {
    this.updating = setInterval(this.updateStats, 1000);
  }

  stopRendering = (): void => {
    this.updating && clearInterval(this.updating);
  }

  render = (): void => {
    this.screen.updateProps(this.getScreenProps());
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
      label: 'Consumer Menu',
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
        Log: {
          keys: ['1'],
          callback: () => this.changeScreen('msglog'),
        },
        Status: {
          keys: ['2'],
          callback: () => this.changeScreen('status'),
        },
        Quit: {
          keys: ['q'],
          callback: () => process.exit(0),
        },
      },
    };
  }
}
