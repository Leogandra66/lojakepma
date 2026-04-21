import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, GripVertical, Star } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  ensureSequentialProductImagePositions,
  fetchProductImages,
  fetchProductImagePositions,
  type ProductImage,
  renormalizePositions,
  syncMainImage,
} from "./productImageManagerUtils";

const MAX_IMAGES = 8;

interface SortableImageProps {
  image: ProductImage;
  isMain: boolean;
  onDelete: () => void;
  onSetMain: () => void;
  isBusy: boolean;
}

function SortableImage({ image, isMain, onDelete, onSetMain, isBusy }: SortableImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-lg overflow-hidden border-2 bg-muted aspect-square touch-none",
        isMain ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
    >
      <img
        src={image.image_url}
        alt={`Posição ${image.position}`}
        className="h-full w-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Drag handle - top-right */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 bg-background/90 hover:bg-background rounded p-1 cursor-grab active:cursor-grabbing shadow-sm"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-3.5 w-3.5 text-foreground" />
      </button>

      {/* Position badge - top-left */}
      <span className="absolute top-1 left-1 bg-background/90 text-xs px-1.5 py-0.5 rounded font-semibold shadow-sm">
        {image.position}
      </span>

      {/* Main badge */}
      {isMain && (
        <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
          <Star className="h-2.5 w-2.5 fill-current" />
          Principal
        </span>
      )}

      {/* Hover actions */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {!isMain && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onSetMain();
            }}
            disabled={isBusy}
            title="Definir como principal"
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isBusy}
          title="Remover imagem"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminImageManager({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  // Local optimistic order (for smooth drag UX)
  const [localOrder, setLocalOrder] = useState<ProductImage[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: imagesFromDb, isLoading } = useQuery({
    queryKey: ["product-images", product.id],
    queryFn: async () => fetchProductImages(product.id),
  });

  const images = localOrder ?? imagesFromDb;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["product-images", product.id] });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product", product.id] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (image: ProductImage) => {
      await ensureSequentialProductImagePositions(product.id);

      // 1. Deleta do storage (se for arquivo nosso)
      const url = image.image_url;
      if (url.includes("/product-images/")) {
        const path = url.split("/product-images/")[1];
        if (path) {
          // Não falha se o arquivo não existir mais
          await supabase.storage.from("product-images").remove([path]);
        }
      }

      // 2. Deleta o registro
      const { error } = await supabase.from("product_images").delete().eq("id", image.id);
      if (error) throw error;

      // 3. Renormaliza as positions restantes
      const remaining = (await fetchProductImagePositions(product.id)).map((img) => img.id);

      if (remaining.length > 0) {
        await renormalizePositions(remaining);
      }

      // 4. Sincroniza imagem principal do produto
      await syncMainImage(product.id);
    },
    onSuccess: () => {
      setLocalOrder(null);
      invalidateAll();
      toast.success("Imagem removida!");
    },
    onError: (err: Error) => {
      setLocalOrder(null);
      toast.error(err.message || "Erro ao remover imagem");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await ensureSequentialProductImagePositions(product.id);
      await renormalizePositions(orderedIds);
      await syncMainImage(product.id);
    },
    onSuccess: () => {
      setLocalOrder(null);
      invalidateAll();
      toast.success("Ordem atualizada!");
    },
    onError: (err: Error) => {
      setLocalOrder(null);
      toast.error(err.message || "Erro ao reordenar");
    },
  });

  const setMainMutation = useMutation({
    mutationFn: async (imageId: string) => {
      await ensureSequentialProductImagePositions(product.id);
      const current = await fetchProductImages(product.id);
      const target = current.find((i) => i.id === imageId);
      if (!target) return;
      // Reordena: target primeiro, depois os demais na ordem atual
      const ordered = [
        target.id,
        ...current
          .filter((i) => i.id !== imageId)
          .sort((a, b) => a.position - b.position)
          .map((i) => i.id),
      ];
      await renormalizePositions(ordered);
      await syncMainImage(product.id);
    },
    onSuccess: () => {
      setLocalOrder(null);
      invalidateAll();
      toast.success("Imagem principal definida!");
    },
    onError: (err: Error) => {
      setLocalOrder(null);
      toast.error(err.message || "Erro ao definir principal");
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = images ?? [];
    const oldIndex = current.findIndex((i) => i.id === active.id);
    const newIndex = current.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(current, oldIndex, newIndex);
    // Atualização otimista visual
    setLocalOrder(
      reordered.map((img, idx) => ({ ...img, position: idx + 1 }))
    );
    reorderMutation.mutate(reordered.map((i) => i.id));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Sempre relê o estado atual no momento do upload
      const { data: existing, error: fetchError } = await supabase
        .from("product_images")
        .select("id, position")
        .eq("product_id", product.id)
        .order("position");
      if (fetchError) throw fetchError;

      const currentCount = existing?.length ?? 0;
      const slotsAvailable = MAX_IMAGES - currentCount;

      if (files.length > slotsAvailable) {
        toast.error(
          `Máximo de ${MAX_IMAGES} imagens por produto. Restam ${slotsAvailable} slot(s).`
        );
        return;
      }

      let nextPosition = currentCount + 1;
      let firstUploadedUrl: string | null = null;

      for (let i = 0; i < files.length; i++) {
        const original = files[i];
        const file = await compressImage(original, {
          maxDimension: 2000,
          quality: 0.92,
          mimeType: "image/webp",
        });
        const ext = file.name.split(".").pop() || "webp";
        const filePath = `${product.id}/${Date.now()}-${i}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: "31536000",
          });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase.from("product_images").insert({
          product_id: product.id,
          image_url: urlData.publicUrl,
          position: nextPosition,
        });
        if (insertError) throw insertError;

        if (i === 0) firstUploadedUrl = urlData.publicUrl;
        nextPosition++;
      }

      // Garante que products.image_url reflete a imagem de menor posição
      await syncMainImage(product.id);

      invalidateAll();
      toast.success(files.length === 1 ? "Imagem enviada!" : "Imagens enviadas!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const currentCount = images?.length ?? 0;
  const canUpload = currentCount < MAX_IMAGES;
  const isBusy =
    deleteMutation.isPending || reorderMutation.isPending || setMainMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-medium">
            {currentCount}/{MAX_IMAGES} imagens
          </p>
          <p className="text-xs text-muted-foreground">
            Arraste para reordenar. A primeira é a principal.
          </p>
        </div>
        {canUpload && (
          <div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              id="image-upload"
            />
            <Button asChild variant="outline" size="sm" disabled={uploading}>
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando..." : "Enviar Imagens"}
              </label>
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : images && images.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img, index) => (
                <SortableImage
                  key={img.id}
                  image={img}
                  isMain={index === 0}
                  onDelete={() => deleteMutation.mutate(img)}
                  onSetMain={() => setMainMutation.mutate(img.id)}
                  isBusy={isBusy || uploading}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p>Nenhuma imagem cadastrada</p>
          <p className="text-xs mt-1">Envie até {MAX_IMAGES} imagens para este produto</p>
        </div>
      )}
    </div>
  );
}
