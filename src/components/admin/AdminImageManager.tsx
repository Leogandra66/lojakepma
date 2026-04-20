import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, GripVertical } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

interface ProductImage {
  id: string;
  image_url: string;
  position: number;
  product_id: string;
}

export default function AdminImageManager({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: images, isLoading } = useQuery({
    queryKey: ["product-images", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", product.id)
        .order("position");
      if (error) throw error;
      return data as ProductImage[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (image: ProductImage) => {
      // Delete from storage if it's a storage URL
      const url = image.image_url;
      if (url.includes("product-images")) {
        const path = url.split("/product-images/")[1];
        if (path) {
          await supabase.storage.from("product-images").remove([path]);
        }
      }
      const { error } = await supabase.from("product_images").delete().eq("id", image.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images", product.id] });
      toast.success("Imagem removida!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: existingImages, error: fetchError } = await supabase
        .from("product_images")
        .select("position")
        .eq("product_id", product.id);

      if (fetchError) throw fetchError;

      const occupiedPositions = new Set((existingImages ?? []).map((image) => image.position));
      const availablePositions = Array.from({ length: 8 }, (_, index) => index + 1).filter(
        (position) => !occupiedPositions.has(position)
      );

      if (files.length > availablePositions.length) {
        toast.error("Máximo de 8 imagens por produto");
        return;
      }

      const hadNoImages = (existingImages?.length ?? 0) === 0;

      for (let i = 0; i < files.length; i++) {
        const original = files[i];
        // Comprime mantendo alta qualidade (WebP 92%, máx 2000px no maior lado)
        const file = await compressImage(original, {
          maxDimension: 2000,
          quality: 0.92,
          mimeType: "image/webp",
        });
        const ext = file.name.split(".").pop() || "webp";
        const filePath = `${product.id}/${Date.now()}-${i}.${ext}`;

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

        const nextPosition = availablePositions[i];

        const { error: insertError } = await supabase.from("product_images").insert({
          product_id: product.id,
          image_url: urlData.publicUrl,
          position: nextPosition,
        });
        if (insertError) throw insertError;

        if (hadNoImages && i === 0) {
          await supabase
            .from("products")
            .update({ image_url: urlData.publicUrl })
            .eq("id", product.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["product-images", product.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Imagens enviadas!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const currentCount = images?.length ?? 0;
  const canUpload = currentCount < 8;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {currentCount}/6 imagens
        </p>
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
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square">
              <img
                src={img.image_url}
                alt={`Posição ${img.position}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteMutation.mutate(img)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <span className="absolute top-1 left-1 bg-background/80 text-xs px-1.5 py-0.5 rounded font-medium">
                {img.position}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p>Nenhuma imagem cadastrada</p>
          <p className="text-xs mt-1">Envie até 6 imagens para este produto</p>
        </div>
      )}
    </div>
  );
}
