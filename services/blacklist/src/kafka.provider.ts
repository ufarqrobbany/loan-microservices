import { Kafka, Producer, Consumer } from 'kafkajs';

export function createKafkaClient(brokers: string[]) {
  const kafka = new Kafka({
    brokers,
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
      initialRetryTime: 100,
      retries: 20,
      maxRetryTime: 30000,
      factor: 2
    }
  });
  return kafka;
}

export async function createProducer(kafka: Kafka): Promise<Producer> {
  const producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function createConsumer(kafka: Kafka, groupId: string): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  return consumer;
}
