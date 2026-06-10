import React from "react";
import DOMPurify from "dompurify";

interface SafeHtmlProps {
  content: string | null | undefined;
  className?: string;
}

export function SafeHtml({ content, className }: SafeHtmlProps) {
  if (!content) return null;

  const sanitizedContent = DOMPurify.sanitize(content);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}