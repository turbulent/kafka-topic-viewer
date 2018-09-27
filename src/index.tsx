import * as commander from 'commander';
import * as React from 'react';
import * as blessed from 'blessed';
import { render } from 'react-blessed';
import { Dashboard } from './dashboard';
import { KafkaProducerConfig } from './producer';
import { KafkaConsumer } from './consumer';
import { ProducerDashboard } from './dashboards/producer';
import { ConsumerDashboard } from './dashboards/consumer';

// tslint:disable-next-line
const version = require('../package.json').version;

export class CLIProgram {
  public screen: blessed.Widgets.Screen;
  public consumer!: KafkaConsumer;
  public dashboard!: Dashboard | any;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
    });

    this.screen.key(['C-c'], (_ch, _key) => {
      return process.exit(0);
    });
  }

  setTitle(text: string) {
    this.screen.title = `Kafka Topic Client -- ${text}`;
  }

  setupCLI = () => {
    commander.version(version)
      .command('producer')
      .option('-b, --broker [value]', 'Specify the broker to connect to via hostname:port ', 'localhost:9092')
      .option('-z, --zookeeper [value]', 'Specify the Zookeeper connection via hostname:port', 'localhost:2181')
      .option('-t, --topic [value]', 'Specify the topic to produce message for', 'test.sc.lorem')
      .option('-p, --partitions [value]', 'How many partition to shard on topic', 1)
      .option('-r, --rate [value]', 'Max msg/s to produce (-1 for unlimited)', -1)
      .action(this.onProducer);

    commander
      .command('consumer')
      .option('-b, --broker [value]', 'Specify the broker to connect to via hostname:port ', 'localhost:9092')
      .option('-z, --zookeeper [value]', 'Specify the Zookeeper connection via hostname:port', 'localhost:2181')
      .option('-g, --group [value]', 'Specify the consumer group id', 'group.test.sc.lorem')
      .option('-t, --topic [value]', 'Specify the topic to produce message for', 'test.sc.lorem')
      .option('-m, --mode [value]', 'Specify the operating mode', 'status')
      .action(this.onConsumer);
  }

  onProducer = (cmd): void => {
    const kafkaConfig = {
      broker: cmd.broker,
      topic: cmd.topic,
      partitions: Number(cmd.partitions),
      rate: Number(cmd.rate),
    };

    this.setTitle('Producer Mode');
    this.dashboard = render(<ProducerDashboard kafkaConfig={kafkaConfig}/>, this.screen);
  }

  onConsumer = (cmd): void => {
    this.consumer = new KafkaConsumer(cmd.broker, cmd.zookeeper, cmd.group, cmd.topic);
    this.dashboard = new ConsumerDashboard(this.consumer, cmd.mode);
    this.consumer.initialize();
  }

  run = (): void => {
    this.setupCLI();
    commander.parse(process.argv);
  }
}

const program = new CLIProgram();
program.run();
