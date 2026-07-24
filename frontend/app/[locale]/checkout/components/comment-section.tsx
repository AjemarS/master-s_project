"use client";

import { Textarea } from "~/ui/primitives/textarea";

interface CommentSectionProps {
  comment: string;
  onChange: (v: string) => void;
  tChk: (key: string) => string;
}

export function CommentSection({
  comment,
  onChange,
  tChk,
}: CommentSectionProps) {
  return (
    <Textarea
      value={comment}
      onChange={(e) => onChange(e.target.value)}
      placeholder={tChk("commentPlaceholder")}
      rows={3}
    />
  );
}
