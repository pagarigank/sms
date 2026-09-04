import { SelectQueryBuilder } from 'typeorm';

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  orderColumn?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Apply cursor-based pagination to a TypeORM query builder.
 * Uses the ID column as the default cursor for stable ordering.
 */
export async function applyCursorPagination<T extends { id: string }>(
  queryBuilder: SelectQueryBuilder<T>,
  params: CursorPaginationParams = {},
): Promise<CursorPaginationResult<T>> {
  const {
    cursor,
    limit = 20,
    orderColumn = 'entity.id',
    orderDirection = 'ASC',
  } = params;

  const safeLimit = Math.min(Math.max(limit, 1), 100);

  if (cursor) {
    // Decode cursor (base64 encoded ID)
    const decodedId = Buffer.from(cursor, 'base64').toString('utf-8');
    
    if (orderDirection === 'ASC') {
      queryBuilder.andWhere(`${orderColumn} > :cursor`, { cursor: decodedId });
    } else {
      queryBuilder.andWhere(`${orderColumn} < :cursor`, { cursor: decodedId });
    }
  }

  queryBuilder.orderBy(orderColumn, orderDirection);
  queryBuilder.take(safeLimit + 1); // Fetch one extra to check if there are more

  const data = await queryBuilder.getMany();
  const hasMore = data.length > safeLimit;
  
  if (hasMore) {
    data.pop(); // Remove the extra item
  }

  const nextCursor = hasMore && data.length > 0
    ? Buffer.from(data[data.length - 1].id).toString('base64')
    : undefined;

  return {
    data,
    nextCursor,
    hasMore,
  };
}

/**
 * Create a cursor from an ID.
 */
export function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64');
}

/**
 * Decode a cursor to get the ID.
 */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('utf-8');
}
