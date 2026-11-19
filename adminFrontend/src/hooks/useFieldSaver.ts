import { useQueryClient } from '@tanstack/react-query';
import { updateRecord } from '@/data/db';
import { useToast } from '@/hooks/use-toast';

/** Saves one inline-edited field of a row, refreshes the table, and rethrows so InlineText stays open on failure. */
export const useFieldSaver = (schema: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return async (id: number | string, fields: Record<string, unknown>) => {
    const res = await updateRecord(schema, Number(id), fields);
    if (res.status === 'error') { toast({ title: 'Could not save', variant: 'destructive' }); throw res.error; }
    queryClient.invalidateQueries({ queryKey: [schema] });
  };
};
