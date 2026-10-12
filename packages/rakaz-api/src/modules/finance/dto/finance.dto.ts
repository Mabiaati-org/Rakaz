import { ApiProperty } from '@nestjs/swagger';
import type { RakazPaymentInput, RakazSubscriptionInput } from '@rakaz/contract';
import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

import { paymentMethodMap } from '../../../common/mappers.js';
import { Trim } from '../../../common/validators.js';

const MAX_AMOUNT = 1_000_000_000;

export class SaveSubscriptionDto implements RakazSubscriptionInput {
  @ApiProperty({ example: 'العام الدراسي 2026 - 2027' })
  @Trim()
  @IsString()
  @MinLength(2, { message: 'عنوان فترة الاشتراك مطلوب' })
  @MaxLength(120)
  periodTitle: string;

  @ApiProperty({ example: 85000 })
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  monthlyFee: number;

  @ApiProperty({ nullable: true, example: 850000 })
  @ValidateIf((o: SaveSubscriptionDto) => o.yearlyFee !== null)
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  yearlyFee: number | null;

  @ApiProperty({ example: 850000, description: 'إجمالي المبلغ المستحق للفترة' })
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  dueAmount: number;

  @ApiProperty({ description: 'Epoch ms' })
  @IsInt()
  @Min(0)
  dueDate: number;
}

export class RecordPaymentDto implements RakazPaymentInput {
  @ApiProperty({ example: 50000 })
  @IsInt()
  @Min(1, { message: 'مبلغ الدفعة يجب أن يكون أكبر من صفر' })
  @Max(MAX_AMOUNT)
  amount: number;

  @ApiProperty({ description: 'Epoch ms' })
  @IsInt()
  @Min(0)
  date: number;

  @ApiProperty({ enum: paymentMethodMap.wireValues })
  @IsIn(paymentMethodMap.wireValues)
  method: RakazPaymentInput['method'];

  @ApiProperty()
  @Trim()
  @IsString()
  @MaxLength(300)
  note: string;
}
