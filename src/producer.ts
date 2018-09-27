import {
  KafkaClient,
  Producer,
  KeyedMessage,
} from 'kafka-node';
import { v4 } from 'uuid';

import * as faker from 'faker';
import { EventEmitter } from 'events';

type ProducerEvents = 'message' | 'sendError' | 'log';

export interface KafkaProducerConfig {
  broker: string;
  topic: string;
  partitions: number;
  rate: number;
}
export declare interface KafkaProducer extends EventEmitter {
  on(event: 'message', listener: (data: any) => any): this;
  on(event: 'sendError', listener: (err: any) => any): this;
  on(event: 'log', listener: (line: string) => any): this;
  emit(event: ProducerEvents, ...rest);
}

export class KafkaProducer extends EventEmitter {
  private client!: KafkaClient;
  private producer!: Producer;
  public broker: string;
  public topic: string;
  public partitions: number;
  public rate: number;
  public partitionsIds!: number[];

  constructor(config: KafkaProducerConfig) {
    super();
    this.broker = config.broker;
    this.topic = config.topic;
    this.partitions = config.partitions;
    this.rate = config.rate;
    this.partitionsIds = [...Array(this.partitions)].map((_, i) => i);
  }

  initialize = () => {
    this.client = new KafkaClient({
      kafkaHost: this.broker,
      autoConnect: true,
      connectTimeout: 5,
      requestTimeout: 10000,
    });

    this.client.on('connect', this.onClientConnect);
    this.client.on('error', this.onClientError);
    this.client.on('close', this.onClientClose);
    this.client.on('reconnect', this.onClientReconnect);
    this.client.on('brokersChanged', this.onClientBrokerChanged);
    this.client.on('socket_error', this.onClientSocketError);

    this.producer = new Producer(this.client, {
      ackTimeoutMs: 100,
      partitionerType: 2,
    });
    this.producer.on('ready', this.onProducerReady);
    this.producer.on('error', this.onProducerError);

    process.once('SIGINT', this.onSigInt);
  }

  onClientSocketError = () => {
    this.emit('log', 'Client Socket Error');
  }

  onClientBrokerChanged = () => {
    this.emit('log', 'Client Broker Changed');
  }

  onClientReconnect = () => {
    this.emit('log', 'Client Reconnected');
  }

  onClientConnect = () => {
    this.emit('log', 'Client Connected');
  }

  onClientClose = () => {
    this.emit('log', 'Client Closed');
  }

  onClientError = (err) => {
    this.emit('log', `Connection Error ${err}`);
  }

  onSigInt = () => {
    console.log('Trapped SIGINT');
    this.producer.close(process.exit);
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
        this.client.refreshMetadata([this.topic], this.produce);
      }
    });

  }

  produce = async (): Promise<void> => {
    try {
      this.producer.send([
        {
          topic: this.topic,
          messages: [
            new KeyedMessage(v4(), JSON.stringify({ text: faker.lorem.sentence() })),
          ],
          partition: faker.random.arrayElement(this.partitionsIds),
          attributes: 0,
        },
      ], this.onSend);
    } catch (e) {
      this.emit('log', `Error ${e}`);
    }
  }

  onSend = (err: any, data: any) => {
    if (!err) {
      this.emit('message', data);
    } else {
      this.emit('sendError', err);
    }

    if (this.rate <= 0) {
      this.produce();
    } else {
      setTimeout(this.produce, 1000 / this.rate);
    }
  }
}
