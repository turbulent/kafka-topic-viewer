import {
  ConsumerGroup,
} from 'kafka-node';
import { EventEmitter } from 'events';

type ConsumerEvents = 'message' | 'log';

export declare interface KafkaConsumer extends EventEmitter {
  on(event: 'message', listener: (data: any) => any): this;
  on(event: 'sendError', listener: (err: any) => any): this;
  on(event: 'log', listener: (line: string) => any): this;
  emit(event: ConsumerEvents, ...rest);
}

export class KafkaConsumer extends EventEmitter {
  private consumer!: ConsumerGroup;

  constructor(
    public kafkaHost: string,
    public zookeeperHost: string,
    public consumerGroup: string,
    public topic: string) {
      super();
  }

  initialize = () => {

    this.emit('log', 'Initializing');

    this.consumer = new ConsumerGroup({
      host: this.zookeeperHost,
      kafkaHost: this.kafkaHost,
      groupId: this.consumerGroup,
      sessionTimeout: 15000,
      protocol: ['roundrobin'],
      fromOffset: 'earliest',
    }, [ this.topic ]);

    this.consumer.client.on('connect', this.onClientConnected);
    this.consumer.on('message', this.onMessage);
    this.consumer.on('error', this.onConsumerError);
    this.consumer.on('offsetOutOfRange', this.onConsumerOffsetOutOfRange);
    this.consumer.on('rebalanced', this.onConsumerRebalanced);
    this.consumer.on('rebalancing', this.onConsumerRebalancing);

    process.once('SIGINT', this.onSigInt);
  }

  public get memberId() {
    return this.consumer.memberId;
  }

  onClientConnected = (): void => {
    this.emit('log', 'Connected');
  }

  onSigInt = () => {
    console.log('Trapped SIGINT');
    this.consumer.close(true, process.exit);
  }

  onConsumerRebalancing = () => {
    this.emit('log', 'Rebalancing..');
  }

  onConsumerRebalanced = () => {
    this.emit('log', 'Rebalanced');
  }

  onClientConnect = () => {
    this.emit('log', 'Connected');
  }

  onConsumerError = (err) => {
    this.emit('log', `Error ${err}`);
  }

  onConsumerOffsetOutOfRange = (err) => {
    this.emit('log', 'Consumer offset out of range: ', err);
  }

  onMessage = (message) => {
    this.emit('message', message);
  }
}
