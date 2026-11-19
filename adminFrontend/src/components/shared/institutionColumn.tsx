import type { Column } from './DataTable';

/** Every tenant table shows which institution a row belongs to. */
export const INSTITUTION_COLUMN: Column<any> = {
  key: 'institution',
  header: 'Institution',
  className: 'hidden md:table-cell',
  render: (row) => <span className="context-badge">{row.institutions?.short_name ?? '–'}</span>,
};
