import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export interface ChapterSuggestion {
  id: number;
  tenant_id: number;
  subject_id: number;
  name: string;
}

interface ChapterAutocompleteProps {
  subjectId: number | null;
  value: { id: number; name: string } | null;
  onChange: (chapter: ChapterSuggestion | null) => void;
  disabled?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function ChapterAutocomplete({ subjectId, value, onChange, disabled }: ChapterAutocompleteProps) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [suggestions, setSuggestions] = useState<ChapterSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (text: string) => {
    if (!subjectId) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/chapters`, {
        params: { subject_id: subjectId, q: text },
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      setSuggestions(response.data?.data ?? []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error fetching chapter suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    setQuery(text);
    onChange(null);

    if (!subjectId) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowDropdown(true);
    } else if (subjectId) {
      fetchSuggestions(query);
    }
  };

  const handleSelect = (chapter: ChapterSuggestion) => {
    setQuery(chapter.name);
    onChange(chapter);
    setShowDropdown(false);
  };

  return (
    <div className="position-relative" ref={containerRef}>
      <input
        type="text"
        className="form-control radius-8"
        placeholder={subjectId ? 'Type to search chapters...' : 'Select a subject first'}
        value={query}
        disabled={disabled || !subjectId}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
      />
      {value && (
        <span className="text-success-main text-xs position-absolute top-50 end-0 translate-middle-y me-3">
          Selected
        </span>
      )}
      {showDropdown && (
        <ul
          className="list-group position-absolute w-100 shadow-sm"
          style={{ zIndex: 1050, maxHeight: 220, overflowY: 'auto', top: '100%' }}
        >
          {loading && <li className="list-group-item text-muted text-sm">Searching...</li>}
          {!loading && suggestions.length === 0 && (
            <li className="list-group-item text-muted text-sm">
              No chapters found. Ask your coaching admin to add one.
            </li>
          )}
          {!loading &&
            suggestions.map((chapter) => (
              <li
                key={chapter.id}
                className="list-group-item list-group-item-action text-sm d-flex justify-content-between"
                role="button"
                onClick={() => handleSelect(chapter)}
              >
                <span>{chapter.name}</span>
                {chapter.tenant_id === 0 ? (
                  <span className="badge bg-success-focus text-success-main">Base</span>
                ) : (
                  <span className="badge bg-warning-focus text-warning-main">Custom</span>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
