import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCheckDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  reference!: string;

  @IsDateString()
  scheduledReleaseAt!: string;
}
