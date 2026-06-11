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

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  lockHeadings?: boolean;
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

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "150px",
  lockHeadings = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isFirstMount = useRef(true);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(defaultFormats);

  // Sync internal innerHTML with external value only if they differ
  useEffect(() => {
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      if (isFirstMount.current || (!isFocused && currentHTML !== value)) {
        editorRef.current.innerHTML = value || "";
        isFirstMount.current = false;
      }
    }
  }, [value, isFocused]);

  // Query the current formatting state at the caret position
  const updateActiveFormats = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !editorRef.current || !editorRef.current.contains(sel.anchorNode)) {
      return;
    }

    // Detect heading by walking up from the selection anchor node
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

  // Listen for selection changes and key/mouse events to keep active state in sync
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!lockHeadings) return;

    const selection = window.getSelection();
    if (!selection) return;

    // Check if any key is pressed when range selection covers a locked heading
    if (!selection.isCollapsed) {
      try {
        const range = selection.getRangeAt(0);
        const container = document.createElement("div");
        container.appendChild(range.cloneContents());
        const headings = container.querySelectorAll("h2");
        let hasLockedHeading = false;
        headings.forEach((h) => {
          const text = h.textContent?.toLowerCase() || "";
          if (text.includes("about company") || text.includes("company information")) {
            hasLockedHeading = true;
          }
        });
        if (hasLockedHeading) {
          // Allow copy action (Ctrl+C / Cmd+C)
          const isCopy = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c";
          if (isCopy) return;

          if (e.key === "Backspace" || e.key === "Delete") {
            e.preventDefault();

            // Helper to check if a node is locked
            const isLockedNode = (n: Node) => {
              let temp: Node | null = n;
              while (temp && temp !== editorRef.current) {
                if (temp.nodeType === Node.ELEMENT_NODE) {
                  const el = temp as HTMLElement;
                  if (el.tagName === "H2" || el.getAttribute("contenteditable") === "false") {
                    return true;
                  }
                }
                temp = temp.parentNode;
              }
              return false;
            };

            // Helper to get text nodes
            const getTextNodes = (container: Node) => {
              const textNodes: Text[] = [];
              const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
              let node;
              while ((node = walk.nextNode())) {
                textNodes.push(node as Text);
              }
              return textNodes;
            };

            if (editorRef.current) {
              const textNodes = getTextNodes(editorRef.current);
              const editableTextNodesToProcess: { node: Text; start: number; count: number }[] = [];

              textNodes.forEach((textNode) => {
                if (range.intersectsNode(textNode) && !isLockedNode(textNode)) {
                  let start = 0;
                  let count = textNode.length;

                  if (textNode === range.startContainer && textNode === range.endContainer) {
                    start = range.startOffset;
                    count = range.endOffset - range.startOffset;
                  } else if (textNode === range.startContainer) {
                    start = range.startOffset;
                    count = textNode.length - range.startOffset;
                  } else if (textNode === range.endContainer) {
                    start = 0;
                    count = range.endOffset;
                  }

                  if (count > 0) {
                    editableTextNodesToProcess.push({ node: textNode, start, count });
                  }
                }
              });

              editableTextNodesToProcess.forEach(({ node, start, count }) => {
                node.deleteData(start, count);
              });

              // Normalize empty blocks to contain <br>
              const blocks = editorRef.current.querySelectorAll("p, li, div");
              blocks.forEach((block) => {
                if (!isLockedNode(block)) {
                  const text = block.textContent || "";
                  if (text.trim() === "") {
                    if (!block.querySelector("br")) {
                      block.innerHTML = "<br>";
                    }
                  }
                }
              });

              // Place caret at the first selected editable block
              const selectedEditableBlocks = Array.from(editorRef.current.querySelectorAll("p, li, div"))
                .filter(block => !isLockedNode(block) && range.intersectsNode(block));

              if (selectedEditableBlocks.length > 0) {
                const targetBlock = selectedEditableBlocks[0] as HTMLElement;
                const newRange = document.createRange();
                const firstChild = targetBlock.firstChild;
                if (firstChild) {
                  newRange.setStart(firstChild, 0);
                  newRange.setEnd(firstChild, 0);
                } else {
                  newRange.setStart(targetBlock, 0);
                  newRange.setEnd(targetBlock, 0);
                }
                selection.removeAllRanges();
                selection.addRange(newRange);
              }

              handleInput();
            }
            return;
          }

          e.preventDefault();
          return;
        }
      } catch (err) {
        // Fallback
      }
    }

    if (selection.isCollapsed && (e.key === "Backspace" || e.key === "Delete")) {
      const node = selection.anchorNode;
      if (!node) return;

      // Find block container
      let currentBlock: HTMLElement | null = null;
      let temp: Node | null = node;
      while (temp && temp !== editorRef.current) {
        if (temp.nodeType === Node.ELEMENT_NODE) {
          currentBlock = temp as HTMLElement;
          break;
        }
        temp = temp.parentNode;
      }

      if (e.key === "Backspace") {
        if (currentBlock) {
          const range = selection.getRangeAt(0);
          if (range.startOffset === 0) {
            const prevSibling = currentBlock.previousElementSibling;
            if (
              prevSibling &&
              prevSibling.tagName === "H2" &&
              prevSibling.getAttribute("contenteditable") === "false"
            ) {
              e.preventDefault();
              return;
            }
          }
        }
      }

      if (e.key === "Delete") {
        if (currentBlock) {
          const range = selection.getRangeAt(0);
          const textLen = currentBlock.textContent?.length || 0;
          if (range.startOffset === textLen) {
            const nextSibling = currentBlock.nextElementSibling;
            if (
              nextSibling &&
              nextSibling.tagName === "H2" &&
              nextSibling.getAttribute("contenteditable") === "false"
            ) {
              e.preventDefault();
              return;
            }
          }
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!lockHeadings) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      try {
        const range = selection.getRangeAt(0);
        const container = document.createElement("div");
        container.appendChild(range.cloneContents());
        const headings = container.querySelectorAll("h2");
        let hasLockedHeading = false;
        headings.forEach((h) => {
          const text = h.textContent?.toLowerCase() || "";
          if (text.includes("about company") || text.includes("company information")) {
            hasLockedHeading = true;
          }
        });
        if (hasLockedHeading) {
          e.preventDefault();
        }
      } catch (err) {
        // Fallback
      }
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveFormats();
  };

  const executeCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  const toggleHeading = (tag: "h2" | "h3") => {
    const isActive = tag === "h2" ? activeFormats.h2 : activeFormats.h3;
    if (isActive) {
      // Already in this heading — revert to normal paragraph
      document.execCommand("formatBlock", false, "<div>");
    } else {
      document.execCommand("formatBlock", false, `<${tag}>`);
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
      // Ensure protocol is present
      const formattedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      executeCommand("createLink", formattedUrl);
    }
  };

  // Determine if editing area is empty
  const cleanText = value ? value.replace(/<[^>]*>/g, "").trim() : "";
  const showPlaceholder = !cleanText && placeholder;

  // Active button style
  const btnBase = "p-1.5 rounded transition-colors";
  const btnActive = "bg-[#FF2B2B]/10 text-[#FF2B2B]";
  const btnInactive = "hover:bg-gray-200 text-gray-700";

  return (
    <div
      className={cn(
        "border border-gray-200 rounded-xl overflow-hidden bg-white transition-all duration-200",
        isFocused
          ? "border-ring/80 ring-1 ring-[#FF2B2B]/30"
          : "hover:border-gray-300",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-[#F9FAFB] border-b border-gray-200 px-3 py-1.5 select-none">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand("bold");
          }}
          className={cn(btnBase, activeFormats.bold ? btnActive : btnInactive)}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand("italic");
          }}
          className={cn(btnBase, activeFormats.italic ? btnActive : btnInactive)}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand("underline");
          }}
          className={cn(btnBase, activeFormats.underline ? btnActive : btnInactive)}
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>
        
        <div className="w-[1px] h-4 bg-gray-200 mx-1" />
        
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand("insertUnorderedList");
          }}
          className={cn(btnBase, activeFormats.unorderedList ? btnActive : btnInactive)}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand("insertOrderedList");
          }}
          className={cn(btnBase, activeFormats.orderedList ? btnActive : btnInactive)}
          title="Number List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-200 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleHeading("h2");
          }}
          className={cn(btnBase, activeFormats.h2 ? btnActive : btnInactive)}
          title="Heading 2"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleHeading("h3");
          }}
          className={cn(btnBase, activeFormats.h3 ? btnActive : btnInactive)}
          title="Heading 3"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-200 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleLink();
          }}
          className={cn(btnBase, btnInactive)}
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Editing Area */}
      <div className="relative bg-[#F6F6F6] min-h-[150px]">
        {showPlaceholder && (
          <div className="absolute top-3.5 left-4 text-sm text-[#8A8A8A] pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="p-4 outline-none text-sm text-[#3A1F1F] overflow-y-auto w-full min-h-[150px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
