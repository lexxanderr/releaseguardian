import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ChecksService } from './checks.service';
import { CreateCheckDto } from './dto/create-check.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { RejectCheckDto } from './dto/reject-check.dto';

import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Role } from 'src/auth/roles/role.enum';

@ApiTags('Checks')
@Controller('checks')
export class ChecksController {
  constructor(private readonly checks: ChecksService) {}

  private getDemoActorId() {
  if (!process.env.DEV_ACTOR_ID) {
    throw new Error('DEV_ACTOR_ID is not set on Render');
  }
  return process.env.DEV_ACTOR_ID;
}

  @ApiOperation({ summary: 'Create a release check' })
  @Post()
  async create(@Body() dto: CreateCheckDto) {
    const actorId = this.getDemoActorId();
    return this.checks.create(dto, actorId);
  }

  @ApiOperation({ summary: 'Add evidence to a check' })
  @Post(':id/evidence')
  async addEvidence(@Param('id') checkId: string, @Body() dto: AddEvidenceDto) {
    const actorId = this.getDemoActorId();
    return this.checks.addEvidence(checkId, dto, actorId);
  }

  // B1) Approve a check (SUPERVISOR / AUDITOR only)
  @ApiOperation({ summary: 'Approve a check (SUPERVISOR / AUDITOR only)' })
  @ApiHeader({
    name: 'x-rg-role',
    required: true,
    description: 'Role for demo authorization. Allowed: SUPERVISOR | AUDITOR',
  })
  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR, Role.AUDITOR)
  async approve(
    @Param('id') checkId: string,
    @Headers('x-rg-role') role?: string,
  ) {
    const actorId = this.getDemoActorId();
    // role is read by RolesGuard; optional pass-through if you later want it in audit payload
    return this.checks.approve(checkId, actorId);
  }

  // B2) Reject a check (SUPERVISOR / AUDITOR only)
  @ApiOperation({ summary: 'Reject a check (SUPERVISOR / AUDITOR only)' })
  @ApiHeader({
    name: 'x-rg-role',
    required: true,
    description: 'Role for demo authorization. Allowed: SUPERVISOR | AUDITOR',
  })
  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR, Role.AUDITOR)
  async reject(
    @Param('id') checkId: string,
    @Body() dto: RejectCheckDto,
    @Headers('x-rg-role') role?: string,
  ) {
    const actorId = this.getDemoActorId();
    return this.checks.reject(checkId, dto.reason, actorId);
  }

  // A0) Dashboard: list checks
  @ApiOperation({ summary: 'List checks (supports q, status, pagination, sorting)' })
  @Get()
  async listChecks(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
    @Query('sort') sort?: 'createdAt' | 'scheduledReleaseAt',
    @Query('order') order?: 'asc' | 'desc',
  ) {
    const allowedStatuses = new Set(['PENDING', 'APPROVED', 'REJECTED']);
    const normalizedStatus = status?.trim().toUpperCase();

    if (normalizedStatus && !allowedStatuses.has(normalizedStatus)) {
      throw new BadRequestException('Invalid status');
    }

    return this.checks.listChecks({
      q: q?.trim() || undefined,
      status: normalizedStatus as any,
      take: take ? Number(take) : undefined,
      cursor: cursor || undefined,
      sort,
      order,
    });
  }

  // A1) Get a check (with counts)
  @ApiOperation({ summary: 'Get a single check' })
  @Get(':id')
  async getCheck(@Param('id') checkId: string) {
    return this.checks.getCheck(checkId);
  }

  // A2) List evidence for a check
  @ApiOperation({ summary: 'List evidence for a check' })
  @Get(':id/evidence')
  async listEvidence(
    @Param('id') checkId: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedTake =
      typeof take === 'string' && take.trim() !== '' ? Number(take) : undefined;

    return this.checks.listEvidence(checkId, {
      take: Number.isFinite(parsedTake) ? parsedTake : undefined,
      cursor: cursor?.trim() ? cursor.trim() : undefined,
    });
  }

  // A3) List audit for a check
  @ApiOperation({ summary: 'List audit trail (verify=true to validate hash chain)' })
  @Get(':id/audit')
  async listAudit(
    @Param('id') checkId: string,
    @Query('verify') verify?: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.checks.listAudit(checkId, {
      verify: verify === 'true',
      take: take ? Number(take) : undefined,
      cursor: cursor || undefined,
    });
  }
}