import {
  KafkaClient,
  Producer,
  KeyedMessage,
} from 'kafka-node';
import { v4 } from 'uuid';

import * as faker from 'faker';
import { EventEmitter } from 'events';

type ProducerEvents = 'message' | 'sendError' | 'log';

export declare interface KafkaProducer extends EventEmitter {
  on(event: 'message', listener: (data: any) => any): this;
  on(event: 'sendError', listener: (err: any) => any): this;
  on(event: 'log', listener: (line: string) => any): this;
  emit(event: ProducerEvents, ...rest);
}

export class KafkaProducer extends EventEmitter {
  private client!: KafkaClient;
  private producer!: Producer;
  public partitionsIds!: number[];

  constructor(
    public kafkaHost: string,
    public zookeeperHost: string,
    public topic: string,
    public partitions: number) {
      super();
      this.partitionsIds = (new Array(this.partitions)).fill(1).map((_e, i) => i);
  }

  initialize = () => {
    this.client = new KafkaClient({
      kafkaHost: this.kafkaHost,
      autoConnect: true,
      connectTimeout: 5,
      requestTimeout: 10000,
    });

    this.client.on('connect', this.onClientConnect);

    this.producer = new Producer(this.client, {
      ackTimeoutMs: 100,
      partitionerType: 2,
    });

    this.producer.on('ready', this.onProducerReady);
    this.producer.on('error', this.onProducerError);

    process.once('SIGINT', this.onSigInt);
  }

  onSigInt = () => {
    console.log('Trapped SIGINT');
    this.producer.close(process.exit);
  }

  onClientConnect = () => {
    this.emit('log', 'Connected');
  }

  onProducerError = (err): void => {
    this.emit('log', `Error ${err}`);
  }

  onProducerReady = (): void => {
    // console.log('Producer ready');
    this.emit('log', 'Producer Ready');

    this.producer.createTopics([ this.topic ], async (err, _data) => {
      if (err) {
        console.error('Error creating topic', err);
        process.exit(1);
      } else {
        this.emit('log', 'Topic created');
        this.produce();
      }
    });
  }

  produce = async (): Promise<void> => {
    this.producer.send([
      {
        topic: this.topic,
        messages: [
          new KeyedMessage(v4(), faker.lorem.sentence()),
        ],
        partition: faker.random.arrayElement(this.partitionsIds),
        attributes: 0,
      },
    ], this.onSend);
  }

  onSend = (err: any, data: any) => {
    if (!err) {
      this.emit('message', data);
    } else {
      this.emit('sendError', err);
    }

    this.produce();
  }
}
