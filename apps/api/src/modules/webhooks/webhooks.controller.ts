import { Controller, Post, Param, Body, Headers } from '@nestjs/common';
import { WorkflowsService } from '../workflows/workflows.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post(':workflowId')
  async trigger(
    @Param('workflowId') workflowId: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ) {
    await this.workflowsService.executeWorkflow(workflowId, {
      ...body,
      headers,
      triggeredAt: new Date().toISOString(),
    });
    return { received: true };
  }
}
