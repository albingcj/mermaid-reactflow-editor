import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { searchIconify, IconResult } from '@/lib/iconify';
import { Search, Loader2, X } from 'lucide-react';
import { logger } from '@/lib/logger';

interface IconSearchProps {
  onSelect: (iconUrl: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export default function IconSearch({ onSelect, open, onOpenChange, hideTrigger = false }: IconSearchProps) {
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IconResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync with external open prop
  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setQuery('');
      setResults([]);
      setError('');
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const icons = await searchIconify(query, 64);
      setResults(icons);
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
    // Generate Iconify CDN URL for the icon
    const iconUrl = `https://api.iconify.design/${icon.prefix}/${icon.name}.svg`;
    onSelect(iconUrl);
    handleOpenChange(false);
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleOpenChange(true)}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Search Icons
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Search Icons - Iconify</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search icons (e.g., user, home, settings)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            {/* Info Message */}
            {!loading && results.length === 0 && !error && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Search for icons from millions of open source icons</p>
                <p className="text-xs mt-2">Powered by Iconify API</p>
              </div>
            )}

            {/* Results Grid */}
            {results.length > 0 && (
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-2">
                  {results.map((icon, idx) => {
                    const iconId = `${icon.prefix}:${icon.name}`;
                    const iconUrl = `https://api.iconify.design/${icon.prefix}/${icon.name}.svg`;

                    return (
                      <button
                        key={`${iconId}-${idx}`}
                        type="button"
                        onClick={() => handleSelectIcon(icon)}
                        className="group relative aspect-square border rounded-lg hover:border-primary hover:bg-accent transition-all p-2 flex flex-col items-center justify-center"
                        title={iconId}
                        aria-label={iconId}
                      >
                        <img
                          src={iconUrl}
                          alt={icon.name}
                          className="w-8 h-8 object-contain group-hover:scale-110 transition-transform"
                          loading="lazy"
                        />
                        <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                          {icon.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-center text-xs text-muted-foreground py-3 border-t mt-2">
                  Found {results.length} icons
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
