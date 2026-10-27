import { useEffect, useRef, useState } from 'react';
import './CategoryFilter.css';

export const documentCategories = [
  'Kategori',
  'Overview',
  'Business Process',
  'Application Architecture',
  'Data Model',
  'API & Integration',
  'Infrastructure & Deployment',
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
  const wrapperRef = useRef(null);

  // Tutup daftar saat klik di luar komponen atau menekan tombol Esc
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="category-filter" ref={wrapperRef}>
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
