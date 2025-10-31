import { X, Minus, Square, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function TauriTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomControls, setShowZoomControls] = useState(false);

  useEffect(() => {
    // Check if running in Tauri v2
    const checkTauri = async () => {
      if (
        typeof window !== "undefined" &&
        (window as any).__TAURI_INTERNALS__
      ) {
        try {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const appWindow = getCurrentWindow();

          const maximized = await appWindow.isMaximized();
          setIsMaximized(maximized);

          const unlisten = await appWindow.onResized(async () => {
            const maximized = await appWindow.isMaximized();
            setIsMaximized(maximized);
          });

          return () => {
            unlisten();
          };
        } catch (error) {
          console.error("Tauri API error:", error);
        }
      }
    };

    checkTauri();
  }, []);

  useEffect(() => {
    // Keyboard shortcuts for zoom
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.ctrlKey && e.shiftKey && e.key === "+") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.ctrlKey && e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [zoomLevel]);

  const handleMinimize = async () => {
    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().minimize();
      } catch (error) {
        console.error("Minimize error:", error);
      }
    }
  };

  const handleMaximize = async () => {
    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().toggleMaximize();
      } catch (error) {
        console.error("Maximize error:", error);
      }
    }
  };

  const handleClose = async () => {
    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().close();
      } catch (error) {
        console.error("Close error:", error);
      }
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 10, 200);
    setZoomLevel(newZoom);
    const mainContent = document.querySelector('[data-main-content]') as HTMLElement;
    if (mainContent) {
      mainContent.style.transform = `scale(${newZoom / 100})`;
      mainContent.style.transformOrigin = 'top left';
      mainContent.style.width = `${10000 / newZoom}%`;
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 10, 50);
    setZoomLevel(newZoom);
    const mainContent = document.querySelector('[data-main-content]') as HTMLElement;
    if (mainContent) {
      mainContent.style.transform = `scale(${newZoom / 100})`;
      mainContent.style.transformOrigin = 'top left';
      mainContent.style.width = `${10000 / newZoom}%`;
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    const mainContent = document.querySelector('[data-main-content]') as HTMLElement;
    if (mainContent) {
      mainContent.style.transform = 'scale(1)';
      mainContent.style.width = '100%';
    }
  };

  // Only render in Tauri environment (Tauri v2 detection)
  if (typeof window === "undefined" || !(window as any).__TAURI_INTERNALS__) {
    return null;
  }

  return (
    <>
      <div className="h-10 bg-background border-b border-border flex items-center justify-between px-4 select-none fixed top-0 left-0 right-0 z-50">
        {/* <div className="h-10 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border flex items-center justify-between px-4 select-none fixed top-0 left-0 right-0 z-50"> */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-3 flex-1 h-full"
        >
          <img
            src="/auburn_logo.png"
            alt="Ehlers Finances"
            className="h-6 w-6 object-contain pointer-events-none"
          />
          <span className="text-sm font-semibold text-foreground pointer-events-none">
            Ehlers Finances
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={handleMinimize}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={handleMaximize}
          >
            <Square className={isMaximized ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Zoom Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-9 w-9 bg-card/95 backdrop-blur-sm border border-border shadow-lg hover:bg-accent"
        onClick={() => setShowZoomControls(!showZoomControls)}
        title="Zoom Controls (Ctrl+- / Ctrl+Shift+=)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      {/* Zoom Controls Panel */}
      {showZoomControls && (
        <div className="fixed bottom-16 right-4 z-50 flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 50}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-xs font-medium hover:bg-muted rounded transition-colors min-w-[3rem]"
          >
            {zoomLevel}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </>
  );
}
