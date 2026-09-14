'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

/**
 * Resolve a tenant-configurable Lookup List by its entity_type code
 * (e.g. 'room_type') and return its item values.
 *
 * Spec §8 / DoD: lookup-style values must be tenant-configurable, never
 * hard-coded. Falls back to `fallback` while loading or when the list is
 * missing/unpopulated, so forms keep working for fresh tenants.
 */
export function useLookupValues(entityType: string, fallback: string[] = []): string[] {
  const { data: lists } = useQuery({
    queryKey: ['lookup-lists'],
    queryFn: () => apiClient.config.listLookupLists(),
    staleTime: 10 * 60 * 1000,
  });

  const list = (lists?.data as unknown as { entityType: string; id: string }[] | undefined)?.find(
    (l) => l.entityType === entityType
  );

  const { data: items } = useQuery({
    queryKey: ['lookup-items', list?.id],
    queryFn: () => apiClient.config.listLookupItems({ listId: list!.id }),
    enabled: !!list,
    staleTime: 10 * 60 * 1000,
  });

  const values = ((items?.data as unknown as { value: string }[] | undefined) ?? [])
    .filter((i) => !!i.value)
    .map((i) => i.value);

  return values.length > 0 ? values : fallback;
}
