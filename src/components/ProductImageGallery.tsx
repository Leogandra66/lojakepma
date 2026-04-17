import { useState, useRef, useEffect, MouseEvent, WheelEvent } from "react";
import { Package, ZoomIn, Plus, Minus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProductImage {
  id: string;
  image_url: string;
  position: number;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  fallbackUrl?: string | null;
  productName: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;

export default function ProductImageGallery({ images, fallbackUrl, productName }: ProductImageGalleryProps) {
  const isMobile = useIsMobile();
  const sortedImages = [...images].sort((a, b) => a.position - b.position);

  const allImages = sortedImages.length > 0
    ? sortedImages
    : fallbackUrl
      ? [{ id: "fallback", image_url: fallbackUrl, position: 1 }]
      : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedImage = allImages[selectedIndex];

  // Reset zoom/pan ao abrir/fechar ou trocar imagem
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [zoomOpen, selectedIndex]);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2)));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2.5);
    } else {
      resetView();
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (zoom === 1) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.baseY + (e.clientY - dragRef.current.startY),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  if (allImages.length === 0) {
    return (
      <div className="aspect-square overflow-hidden rounded-lg bg-muted flex items-center justify-center">
        <Package className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {/* Main image – clickable for zoom (desktop only) */}
      <button
        onClick={() => !isMobile && setZoomOpen(true)}
        className={cn(
          "relative block w-full aspect-square overflow-hidden rounded-lg bg-white",
          isMobile ? "cursor-default" : "cursor-zoom-in"
        )}
      >
        <img
          src={selectedImage.image_url}
          alt={`${productName} - Imagem ${selectedIndex + 1}`}
          className="h-full w-full object-contain transition-opacity duration-200"
          loading="eager"
          decoding="sync"
        />
        {!isMobile && (
          <span className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="h-4 w-4 text-foreground" />
          </span>
        )}
      </button>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all",
                index === selectedIndex
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <img
                src={img.image_url}
                alt={`${productName} - Miniatura ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom dialog – fundo preto + zoom interativo */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] p-0 bg-black border-black overflow-hidden">
          <DialogTitle className="sr-only">{productName}</DialogTitle>

          <div
            className="relative w-full h-[90vh] flex items-center justify-center select-none overflow-hidden"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onDoubleClick={handleDoubleClick}
            style={{
              cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
            }}
          >
            <img
              src={selectedImage.image_url}
              alt={`${productName} - Imagem ampliada`}
              draggable={false}
              className="max-h-[90vh] max-w-full object-contain transition-transform duration-100 ease-out"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                willChange: "transform",
              }}
            />

            {/* Controles de zoom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xs text-white font-medium tabular-nums w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-white/20 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full"
                onClick={resetView}
                disabled={zoom === 1 && offset.x === 0 && offset.y === 0}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Dica de uso */}
            {zoom === 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full pointer-events-none">
                Use a roda do mouse, duplo clique ou os botões para dar zoom
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
