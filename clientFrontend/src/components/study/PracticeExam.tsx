import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CircleNotch, ImageSquare, Info, X } from "@phosphor-icons/react";
import { supabase } from "@/database/supabase";
import { useAuth } from "@/context/AuthContext";
import { MixedContentRenderer } from "@/components/study/MixedContentRenderer";
import { callFunction } from "@/lib/callFunction";
import type { AnswersData } from "@/pages/AnswersPage";

type Kind = "cat1" | "cat2" | "exam";
interface Question { number: string; text: string; marks: number; topic_id: number | null }
interface Paper { title: string; duration_minutes: number; total_marks: number; questions: Question[] }
type Given = Record<string, { text: string; files: string[] }>;
interface MarkedQuestion { number: string; text: string; marks: number; awarded: number; status: "correct" | "partial" | "wrong" | "blank"; feedback: string; topic: string | null }
interface Result { score: number; total: number; percent: number; weak_topics: { topic: string; awarded: number; marks: number }[]; questions: MarkedQuestion[] }
export interface Attempt {
  paper_serial: number; status: "draft" | "marking" | "marked" | "failed"; timed: boolean; started_at: string;
  paper: Paper; model_answers: AnswersData | null; answers: Given; result: Result | null;
}

import { btnPrimary, btnQuietSoft } from "@/components/pay/PayKit";
const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const primary = btnPrimary;
const quiet = btnQuietSoft;

/** A photo the student attached, shown through a short-lived link because the bucket is private. */
const Thumb = ({ path, onRemove }: { path: string; onRemove: () => void }) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let live = true;
    supabase.storage.from("practice-attachments").createSignedUrl(path, 3600).then(({ data }) => live && setUrl(data?.signedUrl ?? ""));
    return () => { live = false; };
  }, [path]);
  return (
    <div className="relative size-24 overflow-hidden rounded-xl bg-field">
      {url && <img src={url} alt="Your attached working" className="size-full object-cover" />}
      <button onClick={onRemove} aria-label="Remove photo" className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-surface/90 ring-1 ring-line"><X size={14} /></button>
    </div>
  );
};

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ""}${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

interface Props { unitId: number; kind: Kind; serial: number; onClose: () => void; onViewAnswers?: (data: AnswersData, title: string) => void }

/** Takes the practice paper like a quiz, sends it for marking, and shows the marks. */
const PracticeExam = ({ unitId, kind, serial, onClose, onViewAnswers }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["practice-attempt", unitId, kind, serial];
  const { data: attempt, isLoading, refetch } = useQuery({
    queryKey: key,
    // Always read the saved answers when the exam opens; the runner then keeps its own copy while the student types.
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Attempt | null> => {
      const { data, error } = await supabase.from("practice_attempts").select("*").eq("unit_id", unitId).eq("kind", kind).eq("paper_serial", serial).maybeSingle();
      if (error) throw new Error(error.message);
      return data as Attempt | null;
    },
  });

  const [timed, setTimed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState<{ done: number; total: number } | null>(null);

  const start = async () => {
    setStarting(true); setError("");
    const { error: e } = await supabase.rpc("start_attempt", { p_unit: unitId, p_kind: kind, p_timed: timed });
    setStarting(false);
    if (e) return setError("Could not start the paper. Please try again.");
    queryClient.invalidateQueries({ queryKey: ["practice-attempts", unitId] });
    refetch();
  };

  const runMarking = async () => {
    setError(""); setMarking({ done: 0, total: attempt?.paper.questions.length ?? 0 });
    resumed.current = true;
    try {
      for (;;) {
        const r = await callFunction<{ status: string; done?: number; total?: number }>("mark-paper", { unitId, kind, serial });
        if (r.status === "marked") break;
        setMarking({ done: r.done ?? 0, total: r.total ?? 0 });
      }
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["practice-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["profile-practice"] });
    } catch (e) {
      setError((e as Error).message);
    }
    setMarking(null);
  };

  // A marking that was under way (the page was closed or reloaded) carries on.
  const resumed = useRef(false);
  useEffect(() => {
    if (attempt?.status === "marking" && !resumed.current) { resumed.current = true; runMarking(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.status]);

  const back = <button onClick={onClose} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"><ArrowLeft size={16} /> Back to the paper</button>;

  if (isLoading) return <p className="flex items-center gap-2 text-base text-ink-muted" role="status"><CircleNotch size={18} className="animate-spin" /> Opening…</p>;

  if (!attempt) {
    return (
      <div className="max-w-[560px]">
        {back}
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="size-5 accent-[hsl(var(--primary))]" />
          Time me (the paper's own time limit)
        </label>
        <button onClick={start} disabled={starting} className={`${primary} mt-6`}>
          {starting ? <><CircleNotch size={18} className="animate-spin" /> Starting…</> : "Start"}
        </button>
        {error && <p className="mt-3 text-base text-danger" role="alert">{error}</p>}
      </div>
    );
  }

  if (attempt.status === "marked" && attempt.result) return <Results attempt={attempt} onClose={onClose} onViewAnswers={onViewAnswers} />;

  // An error shows only the message, with Try again and Back to the paper side by side.
  if (error) {
    return (
      <div className="max-w-[560px]">
        <p className="text-base text-danger" role="alert">{error}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={runMarking} className={primary}>Try again</button>
          <button onClick={onClose} className={quiet}>Back to the paper</button>
        </div>
      </div>
    );
  }

  if (attempt.status === "marking" || marking) {
    return (
      <div className="max-w-[560px]" role="status">
        {back}
        <p className="flex items-center gap-2 text-lg font-medium"><CircleNotch size={20} className="animate-spin" /> Marking your paper…</p>
        <p className="mt-2 text-base text-ink-muted">
          {marking && marking.total ? `${marking.done} of ${marking.total} questions marked. ` : ""}This can take a few minutes. You can leave and come back; it carries on.
        </p>
      </div>
    );
  }

  return <Runner key={attempt.paper_serial} attempt={attempt} unitId={unitId} kind={kind} userId={user!.id} onClose={onClose} onSubmit={runMarking} />;
};

const Runner = ({ attempt, unitId, kind, userId, onClose, onSubmit }: { attempt: Attempt; unitId: number; kind: Kind; userId: string; onClose: () => void; onSubmit: () => void }) => {
  const { paper } = attempt;
  const [given, setGiven] = useState<Given>(attempt.answers ?? {});
  const [i, setI] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [agree, setAgree] = useState(false);
  const q = paper.questions[i];
  // Moving between questions or to the hand-in screen changes the page height; keep the exam in view.
  const wrap = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) { moved.current = true; return; }
    wrap.current?.scrollIntoView({ block: "start" });
  }, [i, confirming]);
  const cur = given[q.number] ?? { text: "", files: [] };
  const consented = !!(useAuth().user?.user_metadata as Record<string, unknown> | undefined)?.practice_ai_consent;

  const persist = (next: Given) => supabase.rpc("save_attempt_draft", { p_unit: unitId, p_kind: kind, p_serial: attempt.paper_serial, p_answers: next });

  // Autosave a moment after the student stops typing.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved(false);
    const t = setTimeout(() => persist(given).then(() => setSaved(true)), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [given]);

  const set = (patch: Partial<{ text: string; files: string[] }>) => setGiven((g) => ({ ...g, [q.number]: { ...cur, ...patch } }));

  const addPhotos = async (list: FileList | null) => {
    if (!list?.length) return;
    setNote("");
    const room = MAX_PHOTOS - cur.files.length;
    const files = [...list].slice(0, Math.max(0, room));
    if (list.length > room) setNote(`Up to ${MAX_PHOTOS} photos per question.`);
    setUploading(true);
    const added: string[] = [];
    for (const f of files) {
      if (!TYPES.includes(f.type)) { setNote("Photos must be JPG, PNG or WEBP."); continue; }
      if (f.size > MAX_BYTES) { setNote("Each photo must be under 5 MB."); continue; }
      const path = `${userId}/${unitId}/${kind}/${attempt.paper_serial}/${q.number}-${Date.now()}-${added.length}.${f.type.split("/")[1]}`;
      const { error } = await supabase.storage.from("practice-attachments").upload(path, f, { contentType: f.type });
      if (error) setNote("A photo could not be uploaded. Please try again."); else added.push(path);
    }
    setUploading(false);
    if (added.length) set({ files: [...cur.files, ...added] });
  };

  const removePhoto = async (path: string) => {
    await supabase.storage.from("practice-attachments").remove([path]);
    set({ files: cur.files.filter((p) => p !== path) });
  };

  // Optional countdown from when the attempt was started; it submits itself at zero.
  const deadline = attempt.timed ? new Date(attempt.started_at).getTime() + paper.duration_minutes * 60000 : 0;
  const [now, setNow] = useState(Date.now());
  const sent = useRef(false);
  const submit = async () => {
    if (sent.current) return;
    sent.current = true;
    if (!consented) await supabase.auth.updateUser({ data: { practice_ai_consent: true } });
    await persist(given);
    onSubmit();
  };
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  const expired = deadline > 0 && now >= deadline;
  useEffect(() => { if (expired) submit(); }, [expired]); // eslint-disable-line react-hooks/exhaustive-deps

  const answered = (n: string) => !!(given[n]?.text.trim() || given[n]?.files.length);
  const unanswered = useMemo(() => paper.questions.filter((p) => !answered(p.number)).length, [given]); // eslint-disable-line react-hooks/exhaustive-deps

  if (confirming) {
    return (
      <div ref={wrap} className="max-w-[560px] scroll-mt-32">
        <p className="text-lg font-medium">Hand in your paper?</p>
        <p className="mt-2 text-base text-ink-muted">
          {unanswered > 0 ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} not answered. ` : ""}
          You can have a paper marked once, so you will not be able to change your answers after this.
        </p>
        {!consented && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-base">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[hsl(var(--primary))]" />
            I agree that my answers and photos are sent to Google's AI to be marked.
          </label>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={submit} disabled={!consented && !agree} className={primary}>Hand in and mark</button>
          <button onClick={() => setConfirming(false)} className={quiet}>Keep working</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrap} className="max-w-[720px] scroll-mt-32">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button onClick={onClose} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"><ArrowLeft size={16} /> Leave (saved)</button>
        <div className="flex items-center gap-4 font-geist-mono text-sm tabular-nums text-ink-muted">
          <span>{saved ? "Saved" : "Saving…"}</span>
          {deadline > 0 && <span className={deadline - now < 300000 ? "text-danger" : ""} role="timer">{clock(deadline - now)}</span>}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Questions">
        {paper.questions.map((p, n) => (
          <button
            key={p.number} onClick={() => setI(n)} aria-label={`Question ${p.number}${answered(p.number) ? ", answered" : ""}`} aria-current={n === i}
            className={`size-11 rounded-full text-sm tabular-nums transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 ${n === i ? "bg-primary text-primary-foreground" : answered(p.number) ? "bg-field font-medium" : "text-ink-muted ring-1 ring-line hover:bg-field"}`}
          >{p.number}</button>
        ))}
      </div>

      <p className="font-geist-mono text-sm text-ink-muted">Question {q.number} · {q.marks} marks</p>
      <p className="mt-3 whitespace-pre-wrap text-lg">{q.text}</p>

      <textarea
        value={cur.text} onChange={(e) => set({ text: e.target.value })}
        placeholder="Type your answer. Show your working." aria-label={`Your answer to question ${q.number}`}
        className="mt-5 min-h-48 w-full resize-y rounded-2xl bg-field p-4 text-base outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-brand-solid"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {cur.files.map((p) => <Thumb key={p} path={p} onRemove={() => removePhoto(p)} />)}
        {cur.files.length < MAX_PHOTOS && (
          <label className={`${quiet} cursor-pointer`}>
            {uploading ? <CircleNotch size={16} className="animate-spin" /> : <ImageSquare size={16} />} Add a photo
            <input type="file" accept={TYPES.join(",")} multiple className="sr-only" disabled={uploading} onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {note && <p className="mt-2 text-sm text-danger" role="alert">{note}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button onClick={() => setI(i - 1)} disabled={i === 0} className={quiet}><ArrowLeft size={16} /> Previous</button>
        {i < paper.questions.length - 1
          ? <button onClick={() => setI(i + 1)} className={primary}>Next <ArrowRight size={16} /></button>
          : <button onClick={() => setConfirming(true)} className={primary}>Hand in</button>}
        {i < paper.questions.length - 1 && <button onClick={() => setConfirming(true)} className="min-h-11 px-3 text-sm font-medium text-brand hover:opacity-60">Hand in now</button>}
      </div>
    </div>
  );
};

const tone: Record<MarkedQuestion["status"], string> = { correct: "text-success", partial: "text-warning", wrong: "text-danger", blank: "text-ink-muted" };

/** The marks: score, topics to revise, and a breakdown of the questions that lost marks. */
export const Results = ({ attempt, onClose, onViewAnswers }: { attempt: Attempt; onClose: () => void; onViewAnswers?: (data: AnswersData, title: string) => void }) => {
  const r = attempt.result!;
  const missed = r.questions.filter((q) => q.status !== "correct");
  const model = (n: string) => attempt.model_answers?.questions.find((a) => a.question_number === n);
  return (
    <div className="max-w-[720px]">
      <button onClick={onClose} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"><ArrowLeft size={16} /> Back</button>
      <p className="text-3xl font-semibold tabular-nums">{r.score}<span className="text-ink-muted"> / {r.total}</span></p>
      <p className="mt-1 text-lg text-ink-muted">{r.percent}%</p>

      {r.weak_topics.length > 0 && (
        <div className="mt-8">
          <p className="text-sm text-ink-muted">Topics to revise</p>
          <ul className="mt-2 flex flex-col text-base">
            {r.weak_topics.map((t) => (
              <li key={t.topic} className="flex justify-between gap-4 border-b border-line py-2"><span>{t.topic}</span><span className="tabular-nums text-ink-muted">{t.awarded}/{t.marks}</span></li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 text-sm text-ink-muted">{missed.length === 0 ? "Full marks on every question." : `${missed.length} question${missed.length === 1 ? "" : "s"} lost marks`}</p>
      <ul className="mt-2 flex flex-col">
        {missed.map((q) => {
          const m = model(q.number);
          const given = attempt.answers?.[q.number];
          return (
            <li key={q.number} className="border-b border-line">
              <details className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-base [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 truncate">Question {q.number}</span>
                  <span className={`shrink-0 tabular-nums ${tone[q.status]}`}>{q.awarded}/{q.marks}</span>
                </summary>
                <div className="pb-5 group-open:animate-in group-open:fade-in-0 group-open:slide-in-from-top-1 group-open:duration-500 motion-reduce:animate-none">
                  <p className="whitespace-pre-wrap text-base">{q.text}</p>
                  <p className="mt-4 text-sm text-ink-muted">Feedback</p>
                  <div className="mt-1 text-base text-ink-soft"><MixedContentRenderer text={q.feedback} /></div>
                  {given?.text && (<><p className="mt-4 text-sm text-ink-muted">Your answer</p><p className="mt-1 whitespace-pre-wrap text-base text-ink-soft">{given.text}</p></>)}
                  {m && (<><p className="mt-4 text-sm text-ink-muted">Model answer</p><div className="mt-1 rounded-xl bg-field-soft p-4 text-base text-ink-soft"><MixedContentRenderer text={m.answer.final_answer} /></div></>)}
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      {onViewAnswers && attempt.model_answers && (
        <button onClick={() => onViewAnswers(attempt.model_answers!, attempt.paper.title)} className={`${quiet} mt-6`}>View all the answers</button>
      )}
      <p className="mt-6 flex items-start gap-2 text-sm text-ink-muted"><Info size={16} className="mt-0.5 shrink-0" /> Marked by AI. It can make mistakes, so use it as a guide.</p>
    </div>
  );
};

export default PracticeExam;
