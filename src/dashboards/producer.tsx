import { KafkaProducer } from '../producer';
import { TimeStats, DataTable } from '../dashboard';
import { StatusScreen } from '../screens/status.screen';
import * as React from 'react';

interface ProducerDashboardProps {
  producer: KafkaProducer;
  onMount: () => void;
}

interface ProducerDashboardState {
  logItems: string[];
  stats: TimeStats;
}

export class ProducerDashboard extends React.Component<ProducerDashboardProps, ProducerDashboardState> {
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
    this.producer = props.producer;
  }

  componentDidMount() {
    this.producer.on('message', this.onProducerMessage);
    this.producer.on('sendError', this.onProducerSendError);
    this.producer.on('log', this.onProducerLog);
    this.props.onMount();
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
    this.setState(state => {
      const newStats: TimeStats = {
        ...state.stats,
        entries: [...state.stats.entries],
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

      return { stats: newStats };
    });
  }

  addLog(line: string) {
    this.setState(state => {
      const newLogItems = [...state.logItems];

      newLogItems.push(line);
      if (newLogItems.length > this.maxLogEntries) {
        newLogItems.shift();
      }

      return { logItems: newLogItems };
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
        ['Kafka Broker', this.producer.brokerHost ],
        ['Topic', this.producer.topic],
        ['Partitions', this.producer.partitionsIds.join(',') ],
      ],
    };
  }

  render() {
    return (
      <StatusScreen
        logItems={this.state.logItems}
        stats={this.state.stats}
        maxLogEntries={this.maxLogEntries}
        menuOptions={this.getMenuOptions()}
        info={this.getInfoTable()}
      />
    );
  }
}
