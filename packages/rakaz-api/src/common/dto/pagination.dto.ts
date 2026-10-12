import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiPageMeta } from '@rakaz/contract';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

/** Return this from a handler to have `meta` added to the response envelope. */
export class Paginated<T> {
  readonly meta: ApiPageMeta;

  constructor(
    readonly items: T[],
    total: number,
    query: PaginationDto,
  ) {
    this.meta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }
}

/** Return this from a handler to set the envelope's `message`. */
export class WithMessage<T> {
  constructor(
    readonly data: T,
    readonly message: string,
  ) {}
}
