import { useState, useRef, useEffect } from 'react';
import { User, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Advisor } from '@/types/ro';

interface AdvisorComboboxProps {
  value: string;
  onChange: (value: string) => void;
  advisors: Advisor[];
  onCreateAdvisor?: (name: string) => void;
  className?: string;
}

export function AdvisorCombobox({ value, onChange, advisors, onCreateAdvisor, className }: AdvisorComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = advisors.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = advisors.some(a => a.name.toLowerCase() === search.trim().toLowerCase());
  const showCreate = search.trim().length > 0 && !exactMatch;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (name: string) => {
    onChange(name);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreate = () => {
    const name = search.trim();
    if (name) {
      onCreateAdvisor?.(name);
      onChange(name);
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch(value);
          }}
          placeholder="Select Advisor"
          className="h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.map((adv) => (
              <button
                key={adv.id}
                onClick={() => handleSelect(adv.name)}
                className={cn(
                  'w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted transition-colors',
                  value === adv.name && 'bg-primary/10 text-primary font-medium'
                )}
              >
                {value === adv.name && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                <span className={value !== adv.name ? 'ml-5.5' : ''}>{adv.name}</span>
              </button>
            ))}
            {filtered.length === 0 && !showCreate && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No advisors found</div>
            )}
            {showCreate && (
              <button
                onClick={handleCreate}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-primary/10 text-primary font-medium border-t border-border"
              >
                <Plus className="h-3.5 w-3.5" />
                Add new advisor: "{search.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
