import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "./utils";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading1,
  Heading2,
} from "lucide-react";

interface UnifiedJobDetailsEditorProps {
  description: string;
  onChangeDescription: (val: string) => void;
  rolesResponsibilities?: string;
  onChangeRolesResponsibilities?: (val: string) => void;
  requirements?: string;
  onChangeRequirements?: (val: string) => void;
  className?: string;
}

interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  h2: boolean;
  h3: boolean;
}

const defaultFormats: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
  h2: false,
  h3: false,
};

function formatInitialHtml(desc: string, roles?: string, reqs?: string): string {
  let content = desc || "";

  if (!content.trim() && !roles?.trim() && !reqs?.trim()) {
    return "<h2>About the Role</h2><p><br></p><h2>Roles & Responsibilities</h2><p><br></p><h2>Requirements / Qualifications</h2><p><br></p>";
  }

  const hasHeader = /<h[1-6]>/i.test(content) || content.toLowerCase().includes("about the role");
  if (content.trim() && !hasHeader && (roles?.trim() || reqs?.trim())) {
    content = `<h2>About the Role</h2>${content}`;
  }

  if (roles && roles.trim() && !content.toLowerCase().includes("roles & responsibilities")) {
    if (content.trim()) content += "<p><br></p>";
    const formattedRoles = /<[a-z][\s\S]*>/i.test(roles) ? roles : `<p>${roles.replace(/\n/g, "<br>")}</p>`;
    content += `<h2>Roles & Responsibilities</h2>${formattedRoles}`;
  }

  if (reqs && reqs.trim() && !content.toLowerCase().includes("requirements")) {
    if (content.trim()) content += "<p><br></p>";
    const formattedReqs = /<[a-z][\s\S]*>/i.test(reqs) ? reqs : `<p>${reqs.replace(/\n/g, "<br>")}</p>`;
    content += `<h2>Requirements / Qualifications</h2>${formattedReqs}`;
  }

  return content;
}

export function UnifiedJobDetailsEditor({
  description,
  onChangeDescription,
  rolesResponsibilities,
  onChangeRolesResponsibilities,
  requirements,
  onChangeRequirements,
  className,
}: UnifiedJobDetailsEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(defaultFormats);
  const isFirstMount = useRef(true);

  // Sync initial content
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      const combined = formatInitialHtml(description, rolesResponsibilities, requirements);
      if (isFirstMount.current || (currentHTML !== combined && currentHTML !== description)) {
        editorRef.current.innerHTML = combined || description || "";
        isFirstMount.current = false;
      }
    }
  }, [description, rolesResponsibilities, requirements]);

  const updateActiveFormats = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !editorRef.current || !editorRef.current.contains(sel.anchorNode)) {
      return;
    }

    let currentBlock = "";
    let node: Node | null = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName.toUpperCase();
        if (tag === "H2" || tag === "H3") {
          currentBlock = tag;
          break;
        }
      }
      node = node.parentNode;
    }

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
      h2: currentBlock === "H2",
      h3: currentBlock === "H3",
    });
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      if (editorRef.current && editorRef.current.contains(document.activeElement)) {
        updateActiveFormats();
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [updateActiveFormats]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChangeDescription(html);
      if (onChangeRolesResponsibilities) onChangeRolesResponsibilities("");
      if (onChangeRequirements) onChangeRequirements("");
    }
    updateActiveFormats();
  };

  const executeCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  const toggleHeading = (tag: "h2" | "h3") => {
    const sel = window.getSelection();
    if (!sel || !editorRef.current) return;

    let currentHeadingTag = "";
    let headingElement: HTMLElement | null = null;
    let node: Node | null = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const elTag = (node as HTMLElement).tagName.toLowerCase();
        if (elTag === "h2" || elTag === "h3") {
          currentHeadingTag = elTag;
          headingElement = node as HTMLElement;
          break;
        }
      }
      node = node.parentNode;
    }

    const isCurrentlyActive = currentHeadingTag === tag;

    if (isCurrentlyActive && headingElement) {
      // UNDO: Revert heading back to standard paragraph
      if (sel.isCollapsed || headingElement.textContent?.trim() === sel.toString().trim()) {
        document.execCommand("formatBlock", false, "<p>");
      } else {
        const parent = headingElement.parentNode;
        if (parent) {
          while (headingElement.firstChild) {
            parent.insertBefore(headingElement.firstChild, headingElement);
          }
          parent.removeChild(headingElement);
        }
      }
    } else {
      // DO: Apply heading
      if (!sel.isCollapsed) {
        try {
          const range = sel.getRangeAt(0);
          const parentEl = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? (range.commonAncestorContainer as HTMLElement)
            : range.commonAncestorContainer.parentElement;

          const isFullBlockSelected = parentEl && parentEl.textContent?.trim() === sel.toString().trim();
          if (isFullBlockSelected) {
            document.execCommand("formatBlock", false, `<${tag}>`);
          } else {
            const headingSpan = document.createElement(tag);
            headingSpan.className = tag === "h2" ? "inline-block font-bold text-base text-[#3A1F1F]" : "inline-block font-bold text-sm text-[#3A1F1F]";
            try {
              range.surroundContents(headingSpan);
            } catch {
              document.execCommand("formatBlock", false, `<${tag}>`);
            }
          }
        } catch {
          document.execCommand("formatBlock", false, `<${tag}>`);
        }
      } else {
        document.execCommand("formatBlock", false, `<${tag}>`);
      }
    }

    handleInput();
  };

  const handleLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      alert("Please select some text first to link it.");
      return;
    }
    const url = prompt("Enter the URL:");
    if (url) {
      const formattedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      executeCommand("createLink", formattedUrl);
    }
  };

  const btnBase = "p-1.5 rounded transition-colors";
  const btnActive = "bg-[#FF2B2B]/10 text-[#FF2B2B]";
  const btnInactive = "hover:bg-gray-200 text-gray-700";

  return (
    <div
      className={cn(
        "border border-gray-200 rounded-xl overflow-hidden bg-white transition-all duration-200",
        isFocused ? "border-ring/80 ring-1 ring-[#FF2B2B]/30" : "hover:border-gray-300",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-[#F9FAFB] border-b border-gray-200 px-3 py-1.5 select-none">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand("bold"); }}
          className={cn(btnBase, activeFormats.bold ? btnActive : btnInactive)}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand("italic"); }}
          className={cn(btnBase, activeFormats.italic ? btnActive : btnInactive)}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand("underline"); }}
          className={cn(btnBase, activeFormats.underline ? btnActive : btnInactive)}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-200 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand("insertUnorderedList"); }}
          className={cn(btnBase, activeFormats.unorderedList ? btnActive : btnInactive)}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); executeCommand("insertOrderedList"); }}
          className={cn(btnBase, activeFormats.orderedList ? btnActive : btnInactive)}
          title="Number List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-200 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); toggleHeading("h2"); }}
          className={cn(btnBase, activeFormats.h2 ? btnActive : btnInactive)}
          title="Heading 2 (H2)"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); toggleHeading("h3"); }}
          className={cn(btnBase, activeFormats.h3 ? btnActive : btnInactive)}
          title="Heading 3 (H3)"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-200 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleLink(); }}
          className={cn(btnBase, btnInactive)}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Single Continuous ContentEditable Editor Container (Naukri-style) */}
      <div className="relative bg-[#F6F6F6] min-h-[250px]">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          className="rich-text-content p-4 outline-none text-sm text-[#3A1F1F] overflow-y-auto w-full min-h-[250px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:text-[#3A1F1F] [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#3A1F1F] [&_h3]:mt-2 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
        />
      </div>
    </div>
  );
}
