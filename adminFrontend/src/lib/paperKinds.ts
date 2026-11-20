/**
 * The resource types an admin picks from. Past papers carry a kind and an academic year; the stored resource type
 * follows from the kind (CATs are type 3, exams and supplementaries type 2), so the two can never disagree.
 */
export type PaperKind = 'cat1' | 'cat2' | 'exam' | 'supplementary';

export const NOTES = 1, EXAMS = 2, CATS = 3, TUTORIALS = 4;

export const TYPE_OPTIONS: { value: string; label: string; typeId: number; kind: PaperKind | null }[] = [
  { value: 'notes', label: 'Notes', typeId: NOTES, kind: null },
  { value: 'tutorials', label: 'Tutorials', typeId: TUTORIALS, kind: null },
  { value: 'cat1', label: 'CAT 1', typeId: CATS, kind: 'cat1' },
  { value: 'cat2', label: 'CAT 2', typeId: CATS, kind: 'cat2' },
  { value: 'exam', label: 'Exam', typeId: EXAMS, kind: 'exam' },
  { value: 'supplementary', label: 'Supplementary exam', typeId: EXAMS, kind: 'supplementary' },
];

export const isPaperType = (typeId: number) => typeId === EXAMS || typeId === CATS;

/** The option a stored resource corresponds to (papers without a kind yet show as plain exams or CAT 1). */
export const optionFor = (typeId: number, kind?: string | null) =>
  TYPE_OPTIONS.find((o) => o.value === kind) ??
  TYPE_OPTIONS.find((o) => o.typeId === typeId && (o.kind === null || o.value === (typeId === CATS ? 'cat1' : 'exam')));

export const kindLabel = (kind: string) => TYPE_OPTIONS.find((o) => o.value === kind)?.label ?? kind;

/** Academic years as "2025/26", newest first: from next year back ten years. */
export const academicYears = (now = new Date()) => {
  const start = now.getFullYear() + 1;
  return Array.from({ length: 12 }, (_, i) => {
    const y = start - i;
    return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
  });
};

/** Shown when a paper is saved without a title. */
export const defaultPaperName = (kind: string, year: string) => `${kindLabel(kind)} · ${year}`;
