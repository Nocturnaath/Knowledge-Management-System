import { useState } from 'react';

export const documentCategories = [
  'Kategori',
  'Overview',
  'Business Process',
  'Application Architecture',
  'Data Model',
  'API & Integration',
  'Infrastructure & Development',
  'User Guide',
  'Administration Guide',
  'Troubleshooting',
  'Changelog',
  'Notulensi',
  'Memorandum',
  'RAB',
  'Evidence Harian',
  'Manajemen Risiko SPI',
];

export default function CategoryFilter({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="category-filter">
      <button
        className={`category-toggle ${isOpen ? 'open' : ''}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls="category-options"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{value}</span>
        <span className="category-chevron" aria-hidden="true">⌄</span>
      </button>

      {isOpen && (
        <div
          className="category-options"
          id="category-options"
          role="group"
          aria-label="Pilih kategori dokumen"
        >
          {documentCategories.map((category) => (
            <button
              className={value === category ? 'selected' : ''}
              key={category}
              type="button"
              onClick={() => {
                onChange(category);
                setIsOpen(false);
              }}
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
