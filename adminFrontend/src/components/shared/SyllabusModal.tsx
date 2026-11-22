import { useEffect, useState } from 'react';
import { GripVertical, ListChecks, Pencil, Trash2, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormModal } from '@/components/shared/FormModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TopicQuizzes } from '@/components/shared/TopicQuizzes';
import { useToast } from '@/hooks/use-toast';
import { getTopics, addRecord, updateRecord, deleteRecord, type Topic } from '@/data/db';

interface Props {
  unit: { id: number | string; name: string } | null;
  onClose: () => void;
}

const empty = { id: 0, title: '', description: '' };
const NO_TOPICS: Topic[] = []; // stable, so the sync effect below does not re-run on every render

/** Edit a unit's syllabus: the ordered topics that resources are filed under. */
export const SyllabusModal = ({ unit, onClose }: Props) => {
  const unitId = Number(unit?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(empty);
  const [quizTopic, setQuizTopic] = useState<Topic | null>(null);

  const { data: topics = NO_TOPICS, error } = useQuery({
    queryKey: ['topics', unitId],
    enabled: !!unit,
    queryFn: () => getTopics(unitId),
  });

  // The list as shown: follows the server, but reorders instantly while a drag is saved.
  const [order, setOrder] = useState<Topic[]>([]);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  useEffect(() => setOrder(topics), [topics]);

  // (unit_id, position) is unique, so a plain swap would collide: park everything out of range first, then number 1..n.
  const saveOrder = async (next: Topic[]) => {
    const failed = (rs: { status: string }[]) => rs.some((r) => r.status === 'error');
    const parked = await Promise.all(next.map((t, i) => updateRecord('topics', t.id, { position: 10000 + i })));
    const placed = failed(parked) ? parked : await Promise.all(next.map((t, i) => updateRecord('topics', t.id, { position: i + 1 })));
    if (failed(placed)) toast({ title: 'Could not save the new order', variant: 'destructive' });
    refresh();
  };

  const move = (id: number, to: number) => {
    const from = order.findIndex((t) => t.id === id);
    if (from < 0 || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setOrder(next);
    saveOrder(next);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['topics', unitId] });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fields = { title: form.title.trim(), description: form.description.trim() || null };
    const res = form.id
      ? await updateRecord('topics', form.id, fields)
      // unique (unit_id, position): append after the highest existing position
      : await addRecord('topics', { ...fields, unit_id: unitId, position: Math.max(0, ...topics.map((t) => t.position)) + 1 });
    if (res.status === 'error') return toast({ title: 'Could not save topic', variant: 'destructive' });
    setForm(empty);
    refresh();
  };

  const remove = async (id: number) => {
    const res = await deleteRecord('topics', id);
    if (res.status === 'error') return toast({ title: 'Could not delete topic', variant: 'destructive' });
    refresh();
  };

  return (
    <FormModal open={!!unit} onOpenChange={(o) => { if (!o) { setForm(empty); setQuizTopic(null); onClose(); } }} title={`Syllabus: ${unit?.name ?? ''}`} description="Topics group a unit's resources. Notes with no topic show on their own.">
      {quizTopic ? <TopicQuizzes topic={quizTopic} onBack={() => setQuizTopic(null)} /> : (
      <div className="space-y-6">
        {error && <p className="text-sm text-danger">Topics are unavailable. Has the topics migration been run?</p>}

        <ol className="space-y-2">
          {order.map((t, i) => (
            <li
              key={t.id}
              draggable
              onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { if (dragId !== null) { e.preventDefault(); setOverId(t.id); } }}
              onDrop={(e) => { e.preventDefault(); if (dragId !== null) move(dragId, i); setDragId(null); setOverId(null); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              className={`flex items-start gap-3 rounded-2xl bg-field px-4 py-3 transition-opacity ${dragId === t.id ? 'opacity-40' : ''} ${overId === t.id && dragId !== t.id ? 'ring-2 ring-primary' : ''}`}
            >
              <button
                type="button"
                aria-label={`Reorder ${t.title}: drag, or use the up and down arrow keys`}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') { e.preventDefault(); move(t.id, i - 1); }
                  if (e.key === 'ArrowDown') { e.preventDefault(); move(t.id, i + 1); }
                }}
                className="-ml-1 mt-0.5 cursor-grab touch-none rounded text-ink-muted hover:text-ink active:cursor-grabbing"
              >
                <GripVertical className="size-4" />
              </button>
              <span className="mt-0.5 w-5 text-sm font-medium tabular-nums text-ink-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title}</p>
                {t.description && <p className="text-sm text-ink-muted">{t.description}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Quizzes for ${t.title}`} onClick={() => setQuizTopic(t)}><ListChecks /></Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit topic" onClick={() => setForm({ id: t.id, title: t.title, description: t.description ?? '' })}><Pencil /></Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete topic" className="text-danger" onClick={() => remove(t.id)}><Trash2 /></Button>
            </li>
          ))}
          {!order.length && !error && <li className="py-4 text-center text-sm text-ink-muted">No topics yet.</li>}
        </ol>

        <form onSubmit={submit} className="space-y-3 border-t border-line pt-4">
          <Input placeholder="Topic title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Textarea placeholder="Short description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2">
            {form.id > 0 && <Button type="button" variant="outline" onClick={() => setForm(empty)}>Cancel edit</Button>}
            <Button type="submit"><Plus /> {form.id ? 'Update topic' : 'Add topic'}</Button>
          </div>
        </form>
      </div>
      )}
    </FormModal>
  );
};
