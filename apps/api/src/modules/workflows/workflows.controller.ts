import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { Workflow } from './entities/workflow.entity';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  findAll() {
    return this.workflowsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string }) {
    return this.workflowsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Workflow>) {
    return this.workflowsService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.workflowsService.delete(id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.workflowsService.activate(id);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.workflowsService.deactivate(id);
  }
}
