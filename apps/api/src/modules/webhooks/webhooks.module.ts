import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [WorkflowsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
