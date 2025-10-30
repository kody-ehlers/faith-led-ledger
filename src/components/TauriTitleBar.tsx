import { X, Minus, Square, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function TauriTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    // Check if running in Tauri
    if (typeof window !== "undefined" && (window as any).__TAURI__) {
      const { appWindow } = (window as any).__TAURI__.window;
      
      appWindow.isMaximized().then(setIsMaximized);
      
      const unlisten = appWindow.onResized(() => {
        appWindow.isMaximized().then(setIsMaximized);
      });

      return () => {
        unlisten.then((fn: any) => fn());
      };
    }
  }, []);

  const handleMinimize = async () => {
    if ((window as any).__TAURI__) {
      const { appWindow } = (window as any).__TAURI__.window;
      await appWindow.minimize();
    }
  };

  const handleMaximize = async () => {
    if ((window as any).__TAURI__) {
      const { appWindow } = (window as any).__TAURI__.window;
      await appWindow.toggleMaximize();
    }
  };

  const handleClose = async () => {
    if ((window as any).__TAURI__) {
      const { appWindow } = (window as any).__TAURI__.window;
      await appWindow.close();
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 10, 200);
    setZoomLevel(newZoom);
    document.body.style.zoom = `${newZoom}%`;
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 10, 50);
    setZoomLevel(newZoom);
    document.body.style.zoom = `${newZoom}%`;
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    document.body.style.zoom = "100%";
  };

  // Only render in Tauri environment
  if (typeof window === "undefined" || !(window as any).__TAURI__) {
    return null;
  }

  return (
    <>
      <div
        data-tauri-drag-region
        className="h-10 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border flex items-center justify-between px-4 select-none fixed top-0 left-0 right-0 z-50"
      >
        <div className="flex items-center gap-3" data-tauri-drag-region>
          <img src="/auburn-logo.png" alt="Auburn University" className="h-6 w-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Ehlers Finances</span>
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

      {/* Zoom Controls in Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
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
    </>
  );
}
