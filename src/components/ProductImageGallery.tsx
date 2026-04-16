import { useState } from "react";
import { Package, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function ProductImageGallery({ images, fallbackUrl, productName }: ProductImageGalleryProps) {
  const sortedImages = [...images].sort((a, b) => a.position - b.position);

  const allImages = sortedImages.length > 0
    ? sortedImages
    : fallbackUrl
      ? [{ id: "fallback", image_url: fallbackUrl, position: 1 }]
      : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const selectedImage = allImages[selectedIndex];

  if (allImages.length === 0) {
    return (
      <div className="aspect-square overflow-hidden rounded-lg bg-muted flex items-center justify-center">
        <Package className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image – clickable for zoom */}
      <button
        onClick={() => setZoomOpen(true)}
        className="relative group aspect-square overflow-hidden rounded-lg bg-white flex items-center justify-center cursor-zoom-in"
      >
        <img
          src={selectedImage.image_url}
          alt={`${productName} - Imagem ${selectedIndex + 1}`}
          className="max-h-full max-w-full object-contain transition-opacity duration-200"
          loading="eager"
          decoding="sync"
        />
        <span className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="h-4 w-4 text-foreground" />
        </span>
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

      {/* Zoom dialog */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-2 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <DialogTitle className="sr-only">{productName}</DialogTitle>
          <img
            src={selectedImage.image_url}
            alt={`${productName} - Imagem ampliada`}
            className="max-h-[90vh] max-w-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
