import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum EvidenceType {
  COURT_ORDER = 'COURT_ORDER',
  LICENCE_STATUS = 'LICENCE_STATUS',
  RECALL_STATUS = 'RECALL_STATUS',
  IMMIGRATION_HOLD = 'IMMIGRATION_HOLD',
  WARRANT_CHECK = 'WARRANT_CHECK',
  SAFEGUARDING_CHECK = 'SAFEGUARDING_CHECK',
  OTHER = 'OTHER',
}

export class AddEvidenceDto {
  @IsEnum(EvidenceType)
  type!: EvidenceType;

  @IsObject()
  @IsNotEmpty()
  value!: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;
}
