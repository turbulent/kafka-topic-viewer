import {
  ConsumerGroup,
} from 'kafka-node';
import { EventEmitter } from 'events';

type ConsumerEvents = 'message' | 'log' | 'rebalancing' | 'rebalanced';

export interface KafkaProducerConfig {
  brokerHost: string;
  zookeeperHost: string;
  consumerGroup: string;
  topic: string;
}

export declare interface KafkaConsumer extends EventEmitter {
  on(event: 'message', listener: (data: any) => any): this;
  on(event: 'sendError', listener: (err: any) => any): this;
  on(event: 'log', listener: (line: string) => any): this;
  on(event: 'rebalancing' | 'rebalanced', listener: () => any): this;
  emit(event: ConsumerEvents, ...rest);
}

export class KafkaConsumer extends EventEmitter {
  private consumer!: ConsumerGroup;
  public brokerHost: string;
  public zookeeperHost: string;
  public consumerGroup: string;
  public topic: string;

  constructor(config: KafkaProducerConfig) {
    super();
    this.brokerHost = config.brokerHost,
    this.zookeeperHost = config.zookeeperHost;
    this.consumerGroup = config.consumerGroup;
    this.topic = config.topic;
  }

  initialize = () => {

    this.emit('log', 'Initializing');

    this.consumer = new ConsumerGroup({
      // XXX check that zookpr host isn't needed
      // host: this.zookeeperHost,
      kafkaHost: this.brokerHost,
      groupId: this.consumerGroup,
      sessionTimeout: 15000,
      protocol: ['roundrobin'],
      fromOffset: 'earliest',
    }, [ this.topic ]);

    this.consumer.client.on('connect', this.onClientConnect);
    this.consumer.client.on('error', this.onClientError);
    this.consumer.client.on('close', this.onClientClose);
    this.consumer.client.on('reconnect', this.onClientReconnect);
    this.consumer.client.on('brokersChanged', this.onClientBrokerChanged);
    this.consumer.client.on('socket_error', this.onClientSocketError);

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
    this.consumer.close(true, process.exit);
  }

  onConsumerRebalancing = () => {
    this.emit('log', 'Rebalancing..');
    this.emit('rebalancing');
  }

  onConsumerRebalanced = () => {
    this.emit('log', 'Rebalanced');
    this.emit('rebalanced');
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
