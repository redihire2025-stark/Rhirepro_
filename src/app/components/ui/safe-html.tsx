import React from "react";

interface SafeHtmlProps {
  content: string | null | undefined;
  className?: string;
}

export function SafeHtml({ content, className }: SafeHtmlProps) {
  if (!content) return null;

  // Simple check for HTML tags
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Fallback for plain text, preserving line breaks
  return (
    <div className={className} style={{ whiteSpace: "pre-line" }}>
      {content}
    </div>
  );
}
