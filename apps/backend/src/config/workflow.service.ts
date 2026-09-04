import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';
import { WorkflowInstance } from './workflow-instance.entity';
import { WorkflowApproval } from './workflow-approval.entity';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowDefinition) private definitionsRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance) private instancesRepo: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowApproval) private approvalsRepo: Repository<WorkflowApproval>,
  ) {}

  /**
   * Get all workflow definitions for a tenant.
   */
  async getDefinitions(tenantId: string): Promise<WorkflowDefinition[]> {
    return this.definitionsRepo.find({ where: { tenantId, isActive: true } });
  }

  /**
   * Get workflow definition by ID.
   */
  async getDefinition(id: string): Promise<WorkflowDefinition> {
    const def = await this.definitionsRepo.findOne({ where: { id } });
    if (!def) throw new NotFoundException('Workflow definition not found');
    return def;
  }

  /**
   * Create a workflow definition.
   */
  async createDefinition(data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const def = this.definitionsRepo.create(data);
    return this.definitionsRepo.save(def);
  }

  /**
   * Start a workflow instance.
   */
  async startWorkflow(
    tenantId: string,
    entityType: string,
    entityId: string,
    requestedBy: string,
    reason?: string,
  ): Promise<WorkflowInstance> {
    // Find the matching workflow definition
    const definition = await this.definitionsRepo.findOne({
      where: { tenantId, entityType, isActive: true },
    });

    if (!definition) {
      throw new BadRequestException(`No active workflow for ${entityType}`);
    }

    // Check if there's already an active instance for this entity
    const existing = await this.instancesRepo.findOne({
      where: { tenantId, entityType, entityId, status: 'pending' },
    });

    if (existing) {
      throw new BadRequestException('A workflow is already in progress for this entity');
    }

    const instance = this.instancesRepo.create({
      tenantId,
      workflowDefinitionId: definition.id,
      entityType,
      entityId,
      currentStep: 0,
      status: 'pending',
      requestedBy,
      requestedAt: new Date(),
      reason,
    });

    return this.instancesRepo.save(instance);
  }

  /**
   * Approve or reject a workflow instance.
   */
  async decide(
    instanceId: string,
    approverUserId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOne({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('Workflow instance not found');

    if (instance.status !== 'pending') {
      throw new BadRequestException('Workflow is not in pending status');
    }

    const definition = await this.getDefinition(instance.workflowDefinitionId);
    const totalSteps = definition.steps.length;

    // Record the approval
    const approval = this.approvalsRepo.create({
      tenantId: instance.tenantId,
      instanceId: instance.id,
      approverUserId,
      stepIndex: instance.currentStep,
      decision,
      reason,
      decidedAt: new Date(),
    });
    await this.approvalsRepo.save(approval);

    // Update instance based on decision
    if (decision === 'rejected') {
      instance.status = 'rejected';
      await this.instancesRepo.save(instance);
      return instance;
    }

    // Move to next step
    instance.currentStep += 1;

    // Check if all steps are completed
    if (instance.currentStep >= totalSteps) {
      instance.status = 'approved';
    }

    await this.instancesRepo.save(instance);
    return instance;
  }

  /**
   * Escalate a workflow instance (after SLA breach).
   */
  async escalate(instanceId: string, escalatedBy: string, reason?: string): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOne({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('Workflow instance not found');

    instance.status = 'escalated';
    await this.instancesRepo.save(instance);

    // Record the escalation
    const approval = this.approvalsRepo.create({
      tenantId: instance.tenantId,
      instanceId: instance.id,
      approverUserId: escalatedBy,
      stepIndex: instance.currentStep,
      decision: 'escalated',
      reason: reason || 'SLA breach - escalated',
      decidedAt: new Date(),
    });
    await this.approvalsRepo.save(approval);

    return instance;
  }

  /**
   * Cancel a workflow instance.
   */
  async cancel(instanceId: string, cancelledBy: string, reason?: string): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOne({ where: { id: instanceId } });
    if (!instance) throw new NotFoundException('Workflow instance not found');

    instance.status = 'cancelled';
    await this.instancesRepo.save(instance);
    return instance;
  }

  /**
   * Get all pending workflows for a tenant.
   */
  async getPendingWorkflows(tenantId: string): Promise<WorkflowInstance[]> {
    return this.instancesRepo.find({ where: { tenantId, status: 'pending' } });
  }

  /**
   * Get workflow history for an entity.
   */
  async getEntityWorkflowHistory(tenantId: string, entityType: string, entityId: string): Promise<WorkflowInstance[]> {
    return this.instancesRepo.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get approvals for a workflow instance.
   */
  async getInstanceApprovals(instanceId: string): Promise<WorkflowApproval[]> {
    return this.approvalsRepo.find({
      where: { instanceId },
      order: { stepIndex: 'ASC', decidedAt: 'ASC' },
    });
  }
}
