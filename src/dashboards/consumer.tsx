import * as blessed from 'blessed';
import * as React from 'react';
import { KafkaConsumer } from '../consumer';
import { TimeStats, DataTable, MessageDetails, Message } from '../dashboard';
import { ConsumerMessagesScreen } from '../screens/consumer.messages.screen';
import { StatusScreen } from '../screens/status.screen';
import { MessageDetailsScreen } from '../screens/message.details.screen';
import { inspect } from 'util';
import * as debounce from 'lodash.debounce';

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
  currentOffset: number;
  partition: number;
  stats: TimeStats;
}

export class ConsumerDashboard extends React.Component<ConsumerDashboardProps, ConsumerDashboardState> {
  public readonly maxLogEntries = 500;
  public readonly maxMessages = 500;

  public batchedUpdates: any = undefined;

  public consumer: KafkaConsumer;
  public prompt?: any;
  public statsTimer?: NodeJS.Timer;

  public state: ConsumerDashboardState = {
    currentScreen: StatusScreen,
    selectedMessage: undefined,
    messages: [],
    logItems: [],
    currentOffset: 0,
    partition: 0,
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
    this.statsTimer = setInterval(this.updateStats, 500);
  }

  componentWillUnmount() {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
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

  addLog = (line: string): void => {
    const newLogItems = [...this.state.logItems];

    newLogItems.push(line);
    if (newLogItems.length > this.maxLogEntries) {
      newLogItems.shift();
    }

    this.setState({ logItems: newLogItems });
  }

  onConsumerMessage = (message): void => {
    const { messages, stats } = this.batchedUpdates || this.state;

    const newMessages = [...messages, this.unpackMessage(message)];
    if (newMessages.length > this.maxMessages) {
      newMessages.shift();
    }

    this.batchedUpdates = {
      messages: newMessages,
      currentOffset: message.highWaterOffset,
      partition: message.partition,
      stats: {
        ...stats,
        accumulator: stats.accumulator + 1,
      },
    };

    this.flushBatchedUpdates();
  }

  flushBatchedUpdates = debounce(() => {
    this.setState(this.batchedUpdates);
    this.batchedUpdates = undefined;
  }, 100, { maxWait: 500 });

  onConsumerError = (err): void => {
    this.addLog(err);
  }

  onConsumerLog = (line: string): void => {
    this.addLog(line);
  }

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
    const newStats: TimeStats = {
      ...this.state.stats,
      entries: [...this.state.stats.entries],
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

    this.setState({ stats: newStats });
  }

  setScreen = (componentType: React.ComponentType<any>) => {
    if (componentType !== this.state.currentScreen) {
      this.setState({ currentScreen: componentType });
    }
  }

  clearMessages = () => {
    if (this.state.messages.length) {
      this.setState({ messages: [] });
    }
  }

  getMenuOptions = (): object => {
    return {
      label: 'Consumer',
      mouse: true,
      autoCommandKeys: false,
      style: {
        selected: {
          fg: '#000000',
          bg: '#ffffff',
          bold: true,
        },
        item: {
          fg: '#000000',
          bg: '#ffffff',
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
        Clear: {
          keys: ['c'],
          callback: () => this.clearMessages(),
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
      currentOffset: this.state.currentOffset,
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
      messageLines: details ? details.lines : [],
    };
  }

  getInfoTable(): DataTable {
    return {
      headers: ['Metric', 'Value'],
      data: [
        ['Mode', 'Consumer'],
        ['Kafka Broker', this.consumer.brokerHost ],
        ['Consumer Group', this.consumer.consumerGroup ],
        ['Topics', this.consumer.topics.join(', ')],
        ['Partition', this.state.partition ],
        ['Partition Offset', this.state.currentOffset ],
        ['Current Rate', this.state.stats.cur + ' msg/s' ],
        ['pid', process.pid],
      ],
    };
  }

  render() {
    const statusHidden = this.state.currentScreen !== StatusScreen;
    const consumerMessagesHidden = this.state.currentScreen !== ConsumerMessagesScreen;
    const messageDetailsHidden = this.state.currentScreen !== MessageDetailsScreen;
    return (
      <>
        <StatusScreen
          {...this.getConsumerStatusScreenProps()}
          hidden={statusHidden}
        />
        <ConsumerMessagesScreen
          {...this.getConsumerMessagesScreenProps()}
          hidden={consumerMessagesHidden}
        />
        <MessageDetailsScreen
          {...this.getMessageDetailsScreenProps()}
          hidden={messageDetailsHidden}
        />
      </>
    );
  }
}
