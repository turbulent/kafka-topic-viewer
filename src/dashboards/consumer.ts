import * as blessed from 'blessed';

import { KafkaConsumer } from '../consumer';
import { Dashboard, TimeStats, DataTable, MessageDetails, Message } from '../dashboard';
import { ConsumerMessagesScreen } from '../screens/consumer.messages.screen';
import { ConsumerStatusScreen } from '../screens/consumer.status.screen';
import { MessageScreen } from '../screens/message.screen';
import { inspect } from 'util';

type DashboardMode = 'status' | 'msglog';

interface ScreenProps {
  maxMessages: number;
  maxLogEntries: number;
  onMessageSelect?: (i: number) => void;
  messages: Message[];
  logs: string[];
  messageDetails?: MessageDetails;
  stats: TimeStats;
  info: DataTable;
  menuOptions: object;
  currentOffset: number;
}

export class ConsumerDashboard extends Dashboard {

  public currentOffset: number = 0;
  public lastValue: any;
  public partition: number = 0;

  protected messages: Message[] = [];
  protected logs: string[] = [];

  public maxLogEntries = 500;
  public maxMessages = 500;
  public selectedMessage?: Message;

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
    this.consumer.on('rebalancing', this.onConsumerRebalancing);
    this.consumer.on('rebalanced', this.onConsumerRebalanced);
    this.pushScreen(ConsumerStatusScreen);
  }

  getScreenProps(): ScreenProps {
    return {
      currentOffset: this.currentOffset,
      maxMessages: this.maxMessages,
      maxLogEntries: this.maxLogEntries,
      onMessageSelect: this.onMessageSelect,
      messages: this.messages,
      logs: this.logs,
      messageDetails: this.getMessageDetails(),
      stats: this.stats,
      info: this.getInfoTable(),
      menuOptions: this.getMenuOptions(),
    };
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
        ['Current Rate', this.stats.cur + ' msg/s' ],
      ],
    };
  }

  getMessageDetails = (): MessageDetails | undefined => {
    if (!this.selectedMessage) {
      return undefined;
    }

    const { value } = this.selectedMessage;

    let dumped = String(value);

    try {
      const parsed = JSON.parse(value);
      dumped = inspect(parsed, true, 5, true);
    } catch (e) {

    }

    return {
      message: this.selectedMessage,
      // tslint:disable-next-line
      lines: dumped.split("\n"),
    };
  }

  onMessageSelect = (index: number): void => {
    this.selectedMessage = this.messages[index];
    this.pushScreen(MessageScreen);
  }

  addMessage = (entry: Message): void => {
    if (this.messages.length > 500) {
      this.messages.shift();
    }
    this.messages.push(entry);
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

  public prompt?: any;

  onConsumerRebalancing = (): void => {
    this.prompt ? this.prompt.detach() : undefined;
    this.prompt = blessed.message({
      label: 'Consumer Status',
      parent: this.currentScreen!.screen,
      border: 'line',
      height: '20%',
      width: 'half',
      top: 'center',
      left: 'center',
    });
    this.prompt.display('Consumer is rebalancing...', 0);
  }

  onConsumerRebalanced = (): void => {
    this.prompt ? this.prompt.detach() : undefined;
    this.prompt = blessed.message({
      label: 'Consumer Status',
      parent: this.currentScreen!.screen,
      border: 'line',
      height: '20%',
      width: 'half',
      top: 'center',
      left: 'center',
    });
    this.prompt.display('Rebalanced!', 3);
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
      label: 'Consumer',
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
          callback: () => this.setScreen(ConsumerStatusScreen),
        },
        Messages: {
          keys: ['2'],
          callback: () => this.setScreen(ConsumerMessagesScreen),
        },
        Quit: {
          keys: ['q'],
          callback: () => process.exit(0),
        },
      },
    };
  }
}
