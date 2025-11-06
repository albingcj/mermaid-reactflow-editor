import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { searchIconify, IconResult } from '@/lib/iconify';
import { Search, Loader2, X } from 'lucide-react';
import { logger } from '@/lib/logger';

interface IconSearchProps {
  onSelect: (iconUrl: string) => void;
}

export default function IconSearch({ onSelect }: IconSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IconResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const icons = await searchIconify(query, 32); // Reduced to 32 for better performance
      setResults(icons);
      setIsExpanded(true);
      if (icons.length === 0) {
        setError('No icons found. Try a different search term.');
      }
    } catch (err) {
      logger.error('Icon search failed:', err);
      setError('Failed to search icons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectIcon = (icon: IconResult) => {
    const iconUrl = `https://api.iconify.design/${icon.prefix}/${icon.name}.svg`;
    onSelect(iconUrl);
    // Reset after selection
    setQuery('');
    setResults([]);
    setIsExpanded(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setError('');
    setIsExpanded(false);
  };

  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search icons..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          size="sm"
          className="h-8 px-3"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
        </Button>
        {(isExpanded || results.length > 0) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 px-2"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-xs p-2 rounded border border-destructive/20">
          {error}
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="border rounded-lg p-2 bg-muted/30 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-6 gap-1.5">
            {results.map((icon, idx) => {
              const iconId = `${icon.prefix}:${icon.name}`;
              const iconUrl = `https://api.iconify.design/${icon.prefix}/${icon.name}.svg`;

              return (
                <button
                  key={`${iconId}-${idx}`}
                  type="button"
                  onClick={() => handleSelectIcon(icon)}
                  className="group aspect-square border rounded hover:border-primary transition-all p-1 flex items-center justify-center checkerboard-bg"
                  title={iconId}
                  aria-label={iconId}
                >
                  <img
                    src={iconUrl}
                    alt={icon.name}
                    className="w-5 h-5 object-contain group-hover:scale-110 transition-transform"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
          <div className="text-center text-[10px] text-muted-foreground pt-2 border-t mt-2">
            {results.length} icons found
          </div>
        </div>
      )}
    </div>
  );
}
