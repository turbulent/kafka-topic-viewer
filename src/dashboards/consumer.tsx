import * as blessed from 'blessed';
import * as React from 'react';
import { KafkaConsumer } from '../consumer';
import { TimeStats, DataTable, MessageDetails, Message } from '../dashboard';
import { ConsumerMessagesScreen } from '../screens/consumer.messages.screen';
import { StatusScreen } from '../screens/status.screen';
import { MessageDetailsScreen } from '../screens/message.details.screen';
import { inspect } from 'util';

interface ConsumerDashboardProps {
  consumer: KafkaConsumer;
  onMount: () => void;
  screen: blessed.Widgets.Screen;
}

interface ConsumerDashboardState {
  currentScreen: React.ComponentType<any>;
  selectedMessage?: Message;
  messages: Message[];
  logItems: string[];
  stats: TimeStats;
}

export class ConsumerDashboard extends React.Component<ConsumerDashboardProps, ConsumerDashboardState> {
  public readonly maxLogEntries = 500;
  public readonly maxMessages = 500;

  public consumer: KafkaConsumer;
  public currentOffset: number = 0;
  public lastValue: any;
  public partition: number = 0;
  public prompt?: any;

  public state: ConsumerDashboardState = {
    currentScreen: StatusScreen,
    selectedMessage: undefined,
    messages: [],
    logItems: [],
    stats: {
      time: Date.now(),
      accumulator: 0,
      max: 0,
      cur: 0,
      entries: [],
      perc: 0,
    },
  };

  constructor(public props: ConsumerDashboardProps) {
    super(props);
    this.consumer = props.consumer;
  }

  componentDidMount() {
    this.consumer.on('message', this.onConsumerMessage);
    this.consumer.on('log', this.onConsumerLog);
    this.consumer.on('rebalancing', this.onConsumerRebalancing);
    this.consumer.on('rebalanced', this.onConsumerRebalanced);
    this.props.onMount();
  }

  unpackMessage = (message): Message => {
    try {
      const unpacked = JSON.parse(message.value);
      return {
        ...message,
        unpacked,
      };
    } catch (e) {}

    return message;
  }

  getMessageDetails = (): MessageDetails | undefined => {
    const { selectedMessage } = this.state;
    if (!selectedMessage) {
      return undefined;
    }

    const { unpacked } = selectedMessage;

    let dumped = String(unpacked);
    try {
      dumped = inspect(unpacked, false, 5, true);
    } catch (e) {}

    return {
      message: selectedMessage,
      lines: dumped.split('\n'),
    };
  }

  onMessageSelect = (index: number): void => {
    this.setState(state => ({
      currentScreen: MessageDetailsScreen,
      selectedMessage: state.messages[index - 1],
    }));
    this.props.screen.key('escape', this.closeMessageScreen);
  }

  closeMessageScreen = () => {
    this.setScreen(ConsumerMessagesScreen);
    this.props.screen.unkey('escape', this.closeMessageScreen);
  }

  addMessage = (entry: Message): void => {
    this.setState(state => {
      const newMessages = [...state.messages];

      newMessages.push(this.unpackMessage(entry));
      if (newMessages.length > this.maxMessages) {
        newMessages.shift();
      }

      return { messages: newMessages };
    });
  }

  addLog = (line: string): void => {
    this.setState(state => {
      const newLogItems = [...state.logItems];

      newLogItems.push(line);
      if (newLogItems.length > this.maxLogEntries) {
        newLogItems.shift();
      }

      return { logItems: newLogItems };
    });
  }

  onConsumerMessage = (message): void => {
    this.currentOffset = message.highWaterOffset;
    this.lastValue = message.value;
    this.partition = message.partition;

    this.setState(state => ({
      stats: {
        ...state.stats,
        accumulator: state.stats.accumulator + 1,
      },
    }));

    this.addMessage(message);
  }

  onConsumerError = (err): void => {
    this.addLog(err);
  }

  onConsumerLog = (line: string): void => {
    this.addLog(line);
  }

  // TODO: make these prompts inside the render()?
  onConsumerRebalancing = (): void => {
    this.prompt && this.prompt.detach();
    this.prompt = blessed.message({
      label: 'Consumer Status',
      parent: this.props.screen,
      border: 'line',
      height: '20%',
      width: 'half',
      top: 'center',
      left: 'center',
    });
    this.prompt.display('Consumer is rebalancing...', 0);
  }

  // TODO: make these prompts inside the render()?
  onConsumerRebalanced = (): void => {
    this.prompt && this.prompt.detach();
    this.prompt = blessed.message({
      label: 'Consumer Status',
      parent: this.props.screen,
      border: 'line',
      height: '20%',
      width: 'half',
      top: 'center',
      left: 'center',
    });
    this.prompt.display('Rebalanced!', 3);
  }

  updateStats = (): void => {
    this.setState(state => {
      const newStats: TimeStats = {
        ...state.stats,
        entries: [...state.stats.entries],
      };

      const now = Date.now();

      if ((now - newStats.time) >= 1000) {
        newStats.entries.push({
          time: now,
          messages: newStats.accumulator,
        });

        newStats.cur = newStats.accumulator;
        if (newStats.accumulator > newStats.max) {
          newStats.max = newStats.accumulator;
        }

        if (newStats.entries.length > 6) {
          newStats.entries.shift();
        }

        newStats.time = now;
        newStats.accumulator = 0;
      }

      if (newStats.entries.length > 0 && newStats.max > 0) {
        const lastEntry = newStats.entries[newStats.entries.length - 1];
        newStats.perc = lastEntry.messages * 100 / newStats.max;
      }

      return { stats: newStats };
    });
  }

  setScreen = (componentType: React.ComponentType<any>) => {
    if (componentType !== this.state.currentScreen) {
      this.setState({ currentScreen: componentType });
    }
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
          callback: () => this.setScreen(StatusScreen),
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

  getConsumerStatusScreenProps() {
    return {
      stats: this.state.stats,
      maxLogEntries: this.maxLogEntries,
      logItems: this.state.logItems,
      info: this.getInfoTable(),
      menuOptions: this.getMenuOptions(),
      screen: this.props.screen,
    };
  }

  getConsumerMessagesScreenProps() {
    return {
      currentOffset: this.currentOffset,
      maxMessages: this.maxMessages,
      maxLogEntries: this.maxLogEntries,
      onMessageSelect: this.onMessageSelect,
      messages: this.state.messages,
      logItems: this.state.logItems,
      info: this.getInfoTable(),
      menuOptions: this.getMenuOptions(),
      screen: this.props.screen,
    };
  }

  getMessageDetailsScreenProps() {
    const details = this.getMessageDetails();
    return {
      messageLines: details ? details.lines : undefined,
    };
  }

  getInfoTable(): DataTable {
    return {
      headers: ['Metric', 'Value'],
      data: [
        ['Mode', 'Consumer'],
        ['Kafka Broker', this.consumer.brokerHost ],
        ['Zookeeper', this.consumer.zookeeperHost ],
        ['Consumer Group', this.consumer.consumerGroup ],
        ['Topic', this.consumer.topic],
        ['Partition', this.partition ],
        ['Partition Offset', this.currentOffset ],
        ['Current Rate', this.state.stats.cur + ' msg/s' ],
      ],
    };
  }

  render() {
    return (
      <>
        <element hidden={this.state.currentScreen !== StatusScreen}>
          <StatusScreen {...this.getConsumerStatusScreenProps()}/>
        </element>
        <element hidden={this.state.currentScreen !== ConsumerMessagesScreen}>
          <ConsumerMessagesScreen {...this.getConsumerMessagesScreenProps()}/>
        </element>
        {/* <element hidden={this.state.currentScreen !== MessageDetailsScreen}>
          <MessageDetailsScreen {...this.getMessageDetailsScreenProps()}/>
        </element> */}
      </>
    );
  }
}
