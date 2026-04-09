import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // If no gallery images, fall back to product.image_url
  const allImages = sortedImages.length > 0
    ? sortedImages
    : fallbackUrl
      ? [{ id: "fallback", image_url: fallbackUrl, position: 1 }]
      : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = allImages[selectedIndex];

  if (allImages.length === 0) {
    return (
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-muted flex items-center justify-center">
        <Package className="h-20 w-20 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-muted flex items-center justify-center">
        <img
          src={selectedImage.image_url}
          alt={`${productName} - Imagem ${selectedIndex + 1}`}
          className="max-h-full max-w-full object-contain transition-opacity duration-200"
        />
      </div>

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
    </div>
  );
}
