import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log('Loan Core running on', port);
}
bootstrap().catch((err) => {
  console.error('Failed to start service:', err);
  process.exit(1);
});
