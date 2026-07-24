"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "~/lib/cn";
import { getImageUrl } from "~/lib/utils/image-url";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "~/ui/primitives/dialog";
import { ProductImage } from "./product-image";

interface ProductGalleryProps {
  imageUrl: string | null | undefined;
  productId: number;
  productName: string;
  discountPercentage?: number;
}

export function ProductGallery({
  imageUrl,
  productId,
  productName,
  discountPercentage,
}: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Single image for now — array pattern ready for future multi-image support
  const images = imageUrl ? [imageUrl] : [];
  const hasMultipleImages = images.length > 1;
  const hasImage = !!imageUrl;

  const handlePrev = () => {
    if (!hasMultipleImages) return;
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!hasMultipleImages) return;
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const imageArea = (
    <div className="group relative aspect-square overflow-hidden rounded-xl bg-muted/30 shadow-md">
      <div className="h-full w-full transition-transform duration-300 group-hover:scale-110">
        <ProductImage
          className="object-cover"
          fill
          imageUrl={imageUrl}
          productId={productId}
          productName={productName}
          priority
        />
      </div>

      {discountPercentage !== undefined && discountPercentage > 0 && (
        <div className="absolute top-2 left-2 rounded-full bg-destructive px-2 py-1 text-xs font-bold text-white">
          -{discountPercentage}%
        </div>
      )}

      {hasMultipleImages && (
        <div className="absolute top-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-xs text-foreground backdrop-blur-sm">
          1/1
        </div>
      )}

      {/* Navigation arrows — hidden for single image */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handlePrev();
        }}
        className={cn(
          "absolute left-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100",
          !hasMultipleImages && "pointer-events-none opacity-0",
        )}
        aria-label="Previous image"
      >
        <div className="rounded-full bg-background/80 p-1 backdrop-blur-sm hover:bg-background/90">
          <ChevronLeft className="h-4 w-4" />
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100",
          !hasMultipleImages && "pointer-events-none opacity-0",
        )}
        aria-label="Next image"
      >
        <div className="rounded-full bg-background/80 p-1 backdrop-blur-sm hover:bg-background/90">
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>

      {/* Dot indicators — hidden for single image */}
      <div
        className={cn(
          "absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5",
          !hasMultipleImages && "hidden",
        )}
      >
        {images.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              i === currentIndex ? "bg-primary" : "bg-primary/30",
            )}
          />
        ))}
      </div>
    </div>
  );

  // No image — render thumbnail without lightbox
  if (!hasImage) {
    return <div className="cursor-default">{imageArea}</div>;
  }

  const fullSrc = getImageUrl(imageUrl);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-zoom-in">{imageArea}</div>
      </DialogTrigger>

      {/* Lightbox */}
      <DialogContent
        className="max-w-4xl w-[90vw] overflow-hidden border-0 bg-transparent p-0 shadow-none"
        showCloseButton={false}
      >
        <div className="relative h-[80vh] w-full">
          {fullSrc && (
            <Image
              src={fullSrc}
              alt={productName}
              fill
              className="object-contain"
              sizes="90vw"
            />
          )}
        </div>
        <DialogClose asChild>
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-background/80 p-2 text-foreground backdrop-blur-sm transition-colors hover:bg-background/90"
            aria-label="Close lightbox"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
