import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export interface TopicSuggestion {
  id: number;
  tenant_id: number;
  subject_id: number;
  name: string;
}

interface TopicAutocompleteProps {
  subjectId: number | null;
  value: { id: number; name: string } | null;
  onChange: (topic: TopicSuggestion | null) => void;
  disabled?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function TopicAutocomplete({ subjectId, value, onChange, disabled }: TopicAutocompleteProps) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
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

  const handleInputChange = (text: string) => {
    setQuery(text);
    onChange(null);

    if (!subjectId) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/topics/autocomplete`, {
          params: { subject_id: subjectId, q: text },
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        setSuggestions(response.data?.data ?? []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error fetching topic suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (topic: TopicSuggestion) => {
    setQuery(topic.name);
    onChange(topic);
    setShowDropdown(false);
  };

  return (
    <div className="position-relative" ref={containerRef}>
      <input
        type="text"
        className="form-control radius-8"
        placeholder={subjectId ? 'Type to search topics...' : 'Select a subject first'}
        value={query}
        disabled={disabled || !subjectId}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
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
              No topics found. Ask your coaching admin to add one.
            </li>
          )}
          {!loading &&
            suggestions.map((topic) => (
              <li
                key={topic.id}
                className="list-group-item list-group-item-action text-sm d-flex justify-content-between"
                role="button"
                onClick={() => handleSelect(topic)}
              >
                <span>{topic.name}</span>
                {topic.tenant_id === 0 ? (
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
