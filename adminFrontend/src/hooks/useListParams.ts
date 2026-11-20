import { useEffect, useState } from 'react';

export type Sort = { key: string; dir: 'asc' | 'desc' } | null;

/** Page, debounced search, institution filter and sort for a list page, with one reset. */
export const useListParams = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [institutionId, setInstitutionId] = useState(0);
  const [sort, setSort] = useState<Sort>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  return {
    page, setPage, search, setSearch, debounced, sort,
    institutionId, setInstitutionId: (id: number) => { setInstitutionId(id); setPage(1); },
    setSort: (s: Sort) => { setSort(s); setPage(1); },
    reset: () => { setSearch(''); setDebounced(''); setInstitutionId(0); setSort(null); setPage(1); },
  };
};
