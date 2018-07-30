import * as commander from 'commander';
import { KafkaProducer } from './producer';
import { Dashboard } from './dashboard';

import { KafkaConsumer } from './consumer';
import { ProducerDashboard } from './dashboards/producer';
import { ConsumerDashboard } from './dashboards/consumer';

// tslint:disable-next-line
const version = require('../package.json').version;

export class CLIProgram {
  public producer!: KafkaProducer;
  public consumer!: KafkaConsumer;
  public dashboard!: Dashboard;

  constructor() { }

  setupCLI = () => {
    commander.version(version)
      .command('producer')
      .option('-b, --broker [value]', 'Specify the broker to connect to via hostname:port ', 'localhost:9092')
      .option('-z, --zookeeper [value]', 'Specify the Zookeeper connection via hostname:port', 'localhost:2181')
      .option('-t, --topic [value]', 'Specify the topic to produce message for', 'test.sc.lorem')
      .option('-p, --partitions [value]', 'How many partition to shard on topic', 1)
      .action(this.onProducer);

    commander
      .command('consumer')
      .option('-b, --broker [value]', 'Specify the broker to connect to via hostname:port ', 'localhost:9092')
      .option('-z, --zookeeper [value]', 'Specify the Zookeeper connection via hostname:port', 'localhost:2181')
      .option('-g, --group [value]', 'Specify the consumer group id', 'group.test.sc.lorem')
      .option('-t, --topic [value]', 'Specify the topic to produce message for', 'test.sc.lorem')
      .action(this.onConsumer);
  }

  onProducer = (cmd): void => {
    this.producer = new KafkaProducer(cmd.broker, cmd.zookeeper, cmd.topic, parseInt(cmd.partitions, 10));
    this.dashboard = new ProducerDashboard(this.producer);
    this.producer.initialize();
  }

  onConsumer = (cmd): void => {
    this.consumer = new KafkaConsumer(cmd.broker, cmd.zookeeper, cmd.group, cmd.topic);
    this.dashboard = new ConsumerDashboard(this.consumer);
    this.consumer.initialize();
  }

  run = (): void => {
    this.setupCLI();
    commander.parse(process.argv);
  }
}

const program = new CLIProgram();
program.run();
