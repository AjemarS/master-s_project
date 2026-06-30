"use client";

import Image from "next/image";
import * as React from "react";

import { cn } from "~/lib/cn";
import { getImageUrl } from "~/lib/utils/image-url";

const palette = [
  ["#e3f2fd", "#1565c0"],
  ["#e8f5e9", "#2e7d32"],
  ["#fff3e0", "#e65100"],
  ["#f3e5f5", "#6a1b9a"],
  ["#e0f7fa", "#00695c"],
  ["#fce4ec", "#c62828"],
  ["#fff8e1", "#f57f17"],
  ["#f1f8e9", "#558b2f"],
  ["#ede7f6", "#4527a0"],
  ["#fbe9e7", "#bf360c"],
];

function pickPalette(id: number) {
  return palette[id % palette.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type CategoryImageProps = {
  imageUrl: string | null | undefined;
  categoryId: number;
  categoryName: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
};

export function CategoryImage({
  imageUrl,
  categoryId,
  categoryName,
  className,
  fill,
  sizes,
}: CategoryImageProps) {
  const src = getImageUrl(imageUrl);
  const [bg, fg] = pickPalette(categoryId);

  if (src) {
    return (
      <Image
        alt={categoryName}
        className={cn("object-cover transition duration-300", className)}
        fill={fill}
        sizes={sizes}
        src={src}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fill && "absolute inset-0",
        className
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      <span
        className="select-none font-bold leading-none"
        style={{ fontSize: "clamp(1.5rem, 5vw, 3rem)" }}
      >
        {initials(categoryName)}
      </span>
    </div>
  );
}
