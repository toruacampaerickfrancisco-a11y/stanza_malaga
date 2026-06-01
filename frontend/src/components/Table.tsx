
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Table.module.css';

interface TableProps {
  columns: Array<{ key: string; label: string; render?: (row: any) => React.ReactNode }>;
  data: any[];
  loading?: boolean;
  error?: string | null;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  onAddNew?: () => void;
  filterComponent?: React.ReactNode;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;
  rowKey?: string;
  onRowClick?: (row: any) => void;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  loading,
  error,
  onSearch,
  searchPlaceholder = 'Buscar...',
  onAddNew,
  filterComponent,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  rowKey = 'id',
  onRowClick
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      // Manejo seguro de valores nulos o indefinidos
      const aValue = a[sortConfig.key] ?? '';
      const bValue = b[sortConfig.key] ?? '';

      // Comparación numérica si ambos son números
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Comparación de strings
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (aString < bString) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aString > bString) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = sortedData.map(row => row[rowKey]);
      onSelectionChange?.(allIds);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  const isAllSelected = data.length > 0 && data.every(row => selectedIds.includes(row[rowKey]));
  const isIndeterminate = data.some(row => selectedIds.includes(row[rowKey])) && !isAllSelected;

  return (
    <div className={styles.tableWrapper}>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          {onSearch && (
            <input
              className={styles.searchInput}
              type="text"
              placeholder={searchPlaceholder}
              onChange={e => onSearch(e.target.value)}
              style={{ flex: 1, marginRight: 8 }}
            />
          )}
          {filterComponent && <div>{filterComponent}</div>}
          {onAddNew && (
            <button className={styles.addButton} onClick={onAddNew}>
              + Nuevo
            </button>
          )}
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                {selectable && (
                  <th className={styles.th} style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th 
                    key={col.key} 
                    className={styles.th} 
                    onClick={() => requestSort(col.key)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div className={styles.thContent}>
                      {col.label}
                      {sortConfig && sortConfig.key === col.key ? (
                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : (
                        <ChevronDown size={14} className={styles.thIcon} style={{ opacity: 0.3 }} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {loading ? (
                <tr><td className={styles.td} colSpan={columns.length + (selectable ? 1 : 0)}>Cargando...</td></tr>
              ) : error ? (
                <tr><td className={styles.td} colSpan={columns.length + (selectable ? 1 : 0)}>{error}</td></tr>
              ) : sortedData.length === 0 ? (
                <tr><td className={styles.td} colSpan={columns.length + (selectable ? 1 : 0)}>Sin datos</td></tr>
              ) : (
                sortedData.map((row, idx) => (
                  <tr key={idx} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
                    {selectable && (
                      <td className={styles.td} style={{ textAlign: 'center' }} data-label="Seleccionar">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row[rowKey])}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(row[rowKey]);
                          }}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.key} className={styles.td} data-label={col.label}>{col.render ? col.render(row) : row[col.key]}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Table;