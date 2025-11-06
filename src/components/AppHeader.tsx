import { Button, Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui";
import Logo from "@/components/Logo";
import {
  Code2,
  Eye,
  FolderOpen,
  Save,
  Download,
  Sun,
  Moon,
  Monitor,
  Menu,
} from "lucide-react";
import type { UseThemeReturn, UsePanelVisibilityReturn } from "@/types";

export interface AppHeaderProps {
  theme: UseThemeReturn;
  panel: UsePanelVisibilityReturn;
  onLoadDiagram: () => void;
  onSaveDiagram: () => void;
  onExportJSON: () => void;
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export function AppHeader({
  theme,
  panel,
  onLoadDiagram,
  onSaveDiagram,
  onExportJSON,
  onToggleMobileMenu,
  isMobileMenuOpen,
}: AppHeaderProps) {
  return (
    <header className="border-b bg-card px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
            <Logo className="h-6 w-6 text-primary-foreground" aria-hidden />
          </div>
          <h1 className="font-semibold text-lg">Mermaid Editor</h1>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
          <Button
            variant={panel.visiblePanels.code ? "default" : "ghost"}
            size="sm"
            onClick={() => panel.togglePanelVisibility("code")}
            className="h-8 gap-2 hover:scale-105 transition-all duration-200"
          >
            <Code2 className="h-4 w-4" />
            <span className="hidden sm:inline">Code</span>
          </Button>
          <Button
            variant={panel.visiblePanels.preview ? "default" : "ghost"}
            size="sm"
            onClick={() => panel.togglePanelVisibility("preview")}
            className="h-8 gap-2 hover:scale-105 transition-all duration-200"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button
            variant={panel.visiblePanels.canvas ? "default" : "ghost"}
            size="sm"
            onClick={() => panel.togglePanelVisibility("canvas")}
            className="h-8 gap-2 hover:scale-105 transition-all duration-200"
          >
            <Logo className="h-6 w-6 text-primary-foreground" aria-hidden />
            <span className="hidden sm:inline">Canvas</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadDiagram}
            className="gap-2 hover:bg-muted/80 transition-colors bg-transparent"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Load</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDiagram}
            className="gap-2 hover:bg-muted/80 transition-colors bg-transparent"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportJSON}
            className="gap-2 hover:bg-muted/80 transition-colors bg-transparent"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        {/* Theme selector */}
        <Select value={theme.themePref} onValueChange={(v) => theme.setThemePref(v as 'light' | 'dark' | 'system')}>
          <SelectTrigger size="sm" className="h-8">
            <div className="flex items-center">
              {theme.themePref === 'light' && <Sun className="h-4 w-4" aria-hidden />}
              {theme.themePref === 'dark' && <Moon className="h-4 w-4" aria-hidden />}
              {theme.themePref === 'system' && <Monitor className="h-4 w-4" aria-hidden />}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" aria-hidden />
                <span className="text-sm">System</span>
              </div>
            </SelectItem>
            <SelectItem value="light">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" aria-hidden />
                <span className="text-sm">Light</span>
              </div>
            </SelectItem>
            <SelectItem value="dark">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" aria-hidden />
                <span className="text-sm">Dark</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={onToggleMobileMenu}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 right-4 bg-card border rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200 min-w-48">
          <div className="p-3 space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onLoadDiagram();
                onToggleMobileMenu();
              }}
              className="w-full justify-start gap-2 hover:bg-accent transition-colors"
            >
              <FolderOpen className="h-4 w-4" />
              Load Diagram
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSaveDiagram();
                onToggleMobileMenu();
              }}
              className="w-full justify-start gap-2 hover:bg-accent transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Diagram
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onExportJSON();
                onToggleMobileMenu();
              }}
              className="w-full justify-start gap-2 hover:bg-accent transition-colors"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
