import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ManagingAgentEntity } from '../../entities/managing-agent.entity';
import {
  CreateManagingAgentRequest,
  UpdateManagingAgentRequest,
  ManagingAgentQueryDto,
  ManagingAgentResponse,
} from '../../dto/managing-agent.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class ManagingAgentService {
  constructor(
    @InjectRepository(ManagingAgentEntity)
    private readonly managingAgentRepo: Repository<ManagingAgentEntity>,
  ) {}

  async create(
    req: CreateManagingAgentRequest,
    ownerId: string,
  ): Promise<ManagingAgentResponse> {
    const entity = this.managingAgentRepo.create({ ...req, ownerId });
    const saved = await this.managingAgentRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: ManagingAgentQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<ManagingAgentResponse>> {
    const { offset = 0, limit = 20, search } = query;
    const [items, total] = await this.managingAgentRepo.findAndCount({
      where: {
        ownerId,
        ...(search ? { name: ILike(`%${search}%`) } : {}),
      },
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      offset,
      limit,
      total,
      items: items.map((item) => this.toResponse(item)),
    };
  }

  async findOne(id: string, ownerId: string): Promise<ManagingAgentResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(
    id: string,
    req: UpdateManagingAgentRequest,
    ownerId: string,
  ): Promise<ManagingAgentResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.managingAgentRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.managingAgentRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(
    id: string,
    ownerId: string,
  ): Promise<ManagingAgentEntity> {
    const entity = await this.managingAgentRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Managing agent ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: ManagingAgentEntity): ManagingAgentResponse {
    const { id, ownerId, name, contactName, email, phone, notes, createdAt, updatedAt } = entity;
    return { id, ownerId, name, contactName, email, phone, notes, createdAt, updatedAt };
  }
}
