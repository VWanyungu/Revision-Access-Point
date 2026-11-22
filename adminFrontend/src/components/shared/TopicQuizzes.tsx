import { useState } from 'react';
import { ArrowLeft, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getTopicQuizzes, addRecord, updateRecord, deleteRecord, type QuizQuestion, type Topic, type TopicQuiz } from '@/data/db';

const blank = (): QuizQuestion => ({ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' });
const letter = (i: number) => String.fromCharCode(65 + i);

/** Custom quizzes for one topic. Students see them on the topic's Quiz tab; with none, the tab stays as it was. */
export const TopicQuizzes = ({ topic, onBack }: { topic: Topic; onBack: () => void }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const key = ['topic-quizzes', topic.id];
  const { data: quizzes = [], error } = useQuery({ queryKey: key, queryFn: () => getTopicQuizzes(topic.id) });
  // null: showing the list. Otherwise the quiz being written (id 0 = new).
  const [draft, setDraft] = useState<{ id: number; title: string; questions: QuizQuestion[] } | null>(null);

  const setQ = (i: number, patch: Partial<QuizQuestion>) =>
    setDraft((d) => d && { ...d, questions: d.questions.map((q, n) => (n === i ? { ...q, ...patch } : q)) });
  const setOpt = (i: number, o: number, text: string) =>
    setDraft((d) => d && { ...d, questions: d.questions.map((q, n) => (n === i ? { ...q, options: q.options.map((x, m) => (m === o ? text : x)) } : q)) });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    // Trust boundary: drop blank options (re-pointing the correct one), then require 2+ options and a real correct answer.
    const questions: QuizQuestion[] = [];
    for (const [n, q] of draft.questions.entries()) {
      const options = q.options.map((o) => o.trim());
      const correctText = options[q.correctAnswer];
      const kept = options.filter(Boolean);
      const correctAnswer = correctText ? kept.indexOf(correctText) : -1;
      if (!q.question.trim() || kept.length < 2 || correctAnswer < 0) {
        return toast({ title: `Question ${n + 1} needs text, at least two options and a filled-in correct answer`, variant: 'destructive' });
      }
      questions.push({ question: q.question.trim(), options: kept, correctAnswer, ...(q.explanation?.trim() ? { explanation: q.explanation.trim() } : {}) });
    }
    const fields = { title: draft.title.trim(), questions };
    const res = draft.id ? await updateRecord('topic_quizzes', draft.id, fields) : await addRecord('topic_quizzes', { ...fields, topic_id: topic.id });
    if (res.status === 'error') return toast({ title: 'Could not save quiz', variant: 'destructive' });
    setDraft(null);
    queryClient.invalidateQueries({ queryKey: key });
  };

  const remove = async (id: number) => {
    const res = await deleteRecord('topic_quizzes', id);
    if (res.status === 'error') return toast({ title: 'Could not delete quiz', variant: 'destructive' });
    queryClient.invalidateQueries({ queryKey: key });
  };

  if (draft) {
    return (
      <form onSubmit={save} className="space-y-5">
        <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}><ArrowLeft /> Back to quizzes</Button>
        <Input placeholder="Quiz title, e.g. Check your understanding" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />

        {draft.questions.map((q, i) => (
          <fieldset key={i} className="space-y-2 rounded-2xl bg-field p-4">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium text-ink-muted">Question {i + 1}</legend>
              {draft.questions.length > 1 && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove question ${i + 1}`} className="text-danger"
                  onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, n) => n !== i) })}><Trash2 /></Button>
              )}
            </div>
            <Textarea placeholder="Question" rows={2} value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} />
            {q.options.map((o, m) => (
              <div key={m} className="flex items-center gap-2">
                <input type="radio" name={`correct-${i}`} checked={q.correctAnswer === m} onChange={() => setQ(i, { correctAnswer: m })} aria-label={`Option ${letter(m)} is correct`} />
                <Input placeholder={`Option ${letter(m)}`} value={o} onChange={(e) => setOpt(i, m, e.target.value)} />
                {q.options.length > 2 && (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove option ${letter(m)}`}
                    onClick={() => setQ(i, { options: q.options.filter((_, n) => n !== m), correctAnswer: q.correctAnswer === m ? 0 : q.correctAnswer > m ? q.correctAnswer - 1 : q.correctAnswer })}><X /></Button>
                )}
              </div>
            ))}
            {q.options.length < 6 && <Button type="button" variant="ghost" size="sm" onClick={() => setQ(i, { options: [...q.options, ''] })}><Plus /> Add option</Button>}
            <Textarea placeholder="Explanation shown when answered wrongly (optional)" rows={2} value={q.explanation ?? ''} onChange={(e) => setQ(i, { explanation: e.target.value })} />
          </fieldset>
        ))}

        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blank()] })}><Plus /> Add question</Button>
          <Button type="submit">Save quiz</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}><ArrowLeft /> Back to syllabus</Button>
      <p className="font-medium">Quizzes for {topic.title}</p>
      {error && <p className="text-sm text-danger">Quizzes are unavailable. Has the topic_quizzes SQL been run?</p>}
      <ul className="space-y-2">
        {quizzes.map((q: TopicQuiz) => (
          <li key={q.id} className="flex items-center gap-3 rounded-2xl bg-field px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{q.title}</p>
              <p className="text-sm text-ink-muted">{q.questions.length} question{q.questions.length === 1 ? '' : 's'}</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit quiz" onClick={() => setDraft({ id: q.id, title: q.title, questions: q.questions.map((x) => ({ ...x, explanation: x.explanation ?? '' })) })}><Pencil /></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete quiz" className="text-danger" onClick={() => remove(q.id)}><Trash2 /></Button>
          </li>
        ))}
        {!quizzes.length && !error && <li className="py-4 text-center text-sm text-ink-muted">No custom quizzes yet. Students see the AI quiz buttons until you add one.</li>}
      </ul>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setDraft({ id: 0, title: '', questions: [blank()] })}><Plus /> New quiz</Button>
      </div>
    </div>
  );
};
