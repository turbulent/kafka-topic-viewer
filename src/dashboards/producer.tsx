import { KafkaProducer, KafkaProducerConfig } from '../producer';
import { TimeStats, DataTable } from '../dashboard';
import { ProducerStatusScreen } from '../screens/producer.status.screen';
import * as React from 'react';

interface ProducerDashboardProps {
  kafkaConfig: KafkaProducerConfig;
}

interface ProducerDashboardState {
  logItems: string[];
  stats: TimeStats;
}

export class ProducerDashboard extends React.Component {
  public readonly maxLogEntries = 500;
  public producer: KafkaProducer;
  public partitionsOffset: { [x: number]: number } = {};
  public currentOffset: number = 0;
  public lastValue: any;
  public partition: number = 0;

  public state: ProducerDashboardState = {
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

  constructor(public props: ProducerDashboardProps) {
    super(props);
    this.producer = new KafkaProducer(props.kafkaConfig);
    this.producer.on('message', this.onProducerMessage);
    this.producer.on('sendError', this.onProducerSendError);
    this.producer.on('log', this.onProducerLog);
    this.producer.initialize();
  }

  onProducerMessage = (message): void => {
    const partitions = Object.entries(message[this.producer.topic]);
    const [ partition = 0, offset = 0 ] = partitions[0];
    this.partitionsOffset[partition] = offset;

    this.updateStats();
  }

  onProducerSendError = (err): void => {
    this.addLog(err);
  }

  onProducerLog = (line: string): void => {
    this.addLog(line);
  }

  updateStats() {
    const newStats: TimeStats = {
      ...this.state.stats,
      entries: [...this.state.stats.entries],
    };

    newStats.accumulator++;
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

    this.setState({
      stats: newStats,
    });
  }

  addLog(line: string) {
    const newLogItems = [...this.state.logItems];

    newLogItems.push(line);
    if (newLogItems.length > this.maxLogEntries) {
      newLogItems.shift();
    }

    this.setState({
      logItems: newLogItems,
    });
  }

  getMenuOptions() {
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
        Quit: {
          keys: ['q'],
          callback: () => process.exit(0),
        },
      },
    };
  }

  getInfoTable(): DataTable {
    return {
      headers: ['Metric', 'Value'],
      data: [
        ['Mode', 'Producer'],
        ['Kafka Broker', this.producer.broker ],
        ['Topic', this.producer.topic],
        ['Partitions', this.producer.partitionsIds.join(',') ],
      ],
    };
  }

  render() {
    return (
      <ProducerStatusScreen
        logItems={this.state.logItems}
        stats={this.state.stats}
        maxLogEntries={this.maxLogEntries}
        menuOptions={this.getMenuOptions()}
        info={this.getInfoTable()}
      />
    );
  }
}
