import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowNode, WorkflowEdge } from './entities/workflow.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    @InjectRepository(Workflow)
    private workflowRepo: Repository<Workflow>,
    private whatsappService: WhatsappService,
  ) {}

  async findAll() {
    return this.workflowRepo.find();
  }

  async findOne(id: string) {
    return this.workflowRepo.findOneBy({ id });
  }

  async create(data: { name: string; nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }) {
    const workflow = this.workflowRepo.create({
      name: data.name,
      nodes: data.nodes || [],
      edges: data.edges || [],
    });
    return this.workflowRepo.save(workflow);
  }

  async update(id: string, data: Partial<Workflow>) {
    await this.workflowRepo.update(id, data);
    return this.findOne(id);
  }

  async delete(id: string) {
    await this.workflowRepo.delete(id);
    return { deleted: true };
  }

  async activate(id: string) {
    await this.workflowRepo.update(id, { active: true });
    return { active: true };
  }

  async deactivate(id: string) {
    await this.workflowRepo.update(id, { active: false });
    return { active: false };
  }

  async executeWorkflow(workflowId: string, triggerData: any) {
    const workflow = await this.findOne(workflowId);
    if (!workflow || !workflow.active) return;

    this.logger.log(`Executing workflow: ${workflow.name}`);

    const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
    const edgeMap = new Map<string, WorkflowEdge[]>();

    for (const edge of workflow.edges) {
      if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
      edgeMap.get(edge.source).push(edge);
    }

    const triggerNode = workflow.nodes.find((n) => n.type === 'whatsapp-trigger');
    if (!triggerNode) return;

    await this.executeNode(triggerNode, triggerData, nodeMap, edgeMap);
  }

  private async executeNode(
    node: WorkflowNode,
    context: any,
    nodeMap: Map<string, WorkflowNode>,
    edgeMap: Map<string, WorkflowEdge[]>,
  ) {
    this.logger.debug(`Executing node: ${node.type} (${node.id})`);

    let output = context;

    switch (node.type) {
      case 'whatsapp-trigger':
        output = context;
        break;

      case 'whatsapp-send': {
        const { sessionId, to, text } = node.data;
        const resolvedTo = to === '{{trigger.from}}' ? context.from : to;
        const resolvedText = text.replace(/\{\{trigger\.(\w+)\}\}/g, (_, key) => context[key] || '');
        await this.whatsappService.sendMessage(sessionId, resolvedTo, resolvedText);
        output = { ...context, sent: true };
        break;
      }

      case 'condition': {
        const { field, operator, value } = node.data;
        const fieldValue = context[field];
        let conditionMet = false;

        switch (operator) {
          case 'equals': conditionMet = fieldValue === value; break;
          case 'contains': conditionMet = String(fieldValue).includes(value); break;
          case 'starts_with': conditionMet = String(fieldValue).startsWith(value); break;
          case 'not_empty': conditionMet = !!fieldValue; break;
        }

        const nextEdges = (edgeMap.get(node.id) || []).filter(
          (e) => e.sourceHandle === (conditionMet ? 'true' : 'false'),
        );

        for (const edge of nextEdges) {
          const nextNode = nodeMap.get(edge.target);
          if (nextNode) await this.executeNode(nextNode, output, nodeMap, edgeMap);
        }
        return;
      }

      case 'delay': {
        const ms = (node.data.seconds || 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, ms));
        break;
      }

      case 'http-request': {
        const axios = require('axios');
        const { url, method, body } = node.data;
        const response = await axios({ url, method: method || 'GET', data: body });
        output = { ...context, httpResponse: response.data };
        break;
      }
    }

    const nextEdges = edgeMap.get(node.id) || [];
    for (const edge of nextEdges) {
      const nextNode = nodeMap.get(edge.target);
      if (nextNode) await this.executeNode(nextNode, output, nodeMap, edgeMap);
    }
  }
}
