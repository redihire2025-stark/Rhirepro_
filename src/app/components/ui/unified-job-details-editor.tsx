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
  rolesResponsibilities: string;
  onChangeRolesResponsibilities: (val: string) => void;
  requirements: string;
  onChangeRequirements: (val: string) => void;
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

// Helper to determine if a block element is empty
const isEmptyBlock = (node: Node | null): boolean => {
  if (!node) return false;
  if (node.nodeName === "BR") return true;
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || "").trim() === "";
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const html = (node as HTMLElement).innerHTML.trim();
    return html === "" || html === "<br>" || html === "<p><br></p>" || html === "<div><br></div>" || (node as HTMLElement).textContent?.trim() === "";
  }
  return false;
};

// Helper to find previous sibling ignoring whitespace text nodes
const getPreviousSignificantSibling = (node: Node): Node | null => {
  let prev = node.previousSibling;
  while (prev) {
    if (prev.nodeType === Node.ELEMENT_NODE) {
      return prev;
    }
    if (prev.nodeType === Node.TEXT_NODE && prev.textContent?.trim() !== "") {
      return prev;
    }
    prev = prev.previousSibling;
  }
  return null;
};

// Helper to check if selection is at the start of a specific node
const isAtStartOfNode = (range: Range, node: Node): boolean => {
  if (range.startOffset !== 0) return false;
  let curr: Node | null = range.startContainer;
  while (curr && curr !== node) {
    if (curr.previousSibling) {
      let sib: ChildNode | null = curr.previousSibling;
      while (sib) {
        if (sib.nodeType === Node.ELEMENT_NODE || (sib.nodeType === Node.TEXT_NODE && sib.textContent !== "")) {
          return false;
        }
        sib = sib.previousSibling;
      }
    }
    curr = curr.parentNode;
  }
  return true;
};

// Helper to check if selection is at the end of a specific node
const isAtEndOfNode = (range: Range, node: Node): boolean => {
  let curr: Node | null = range.startContainer;
  if (curr.nodeType === Node.TEXT_NODE) {
    if (range.startOffset !== (curr.textContent?.length || 0)) return false;
  } else {
    if (range.startOffset !== curr.childNodes.length) return false;
  }
  while (curr && curr !== node) {
    if (curr.nextSibling) {
      let sib = curr.nextSibling;
      while (sib) {
        if (sib.nodeType === Node.ELEMENT_NODE || (sib.nodeType === Node.TEXT_NODE && sib.textContent !== "")) {
          return false;
        }
        sib = sib.nextSibling;
      }
    }
    curr = curr.parentNode;
  }
  return true;
};

// Helper to find next sibling ignoring whitespace text nodes
const getNextSignificantSibling = (node: Node): Node | null => {
  let next = node.nextSibling;
  while (next) {
    if (next.nodeType === Node.ELEMENT_NODE) {
      return next;
    }
    if (next.nodeType === Node.TEXT_NODE && next.textContent?.trim() !== "") {
      return next;
    }
    next = next.nextSibling;
  }
  return null;
};

// Helper to retrieve the active LI element containing the caret
const getActiveLi = (selection: Selection | null): HTMLLIElement | null => {
  if (!selection) return null;
  let node: Node | null = selection.anchorNode;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "LI") {
      return node as HTMLLIElement;
    }
    node = node.parentNode;
  }
  return null;
};

// Helper to find the deepest/first text node for focus placement
const getFirstTextNode = (node: Node): Node => {
  if (node.nodeType === Node.TEXT_NODE) return node;
  const child = node.firstChild;
  if (child) return getFirstTextNode(child);
  return node;
};

// Helper to strip classes, styles, and list-related resets from pasted HTML, and convert text bullets to actual LIs
const cleanPastedHtml = (rawHtml: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  const cleanNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toUpperCase();

      // Strip layout/class/styling attributes that might push lists to the left
      el.removeAttribute("class");
      el.removeAttribute("style");
      el.removeAttribute("id");

      // Convert P/DIV paragraphs starting with bullet characters into actual LI nodes
      if (tagName === "P" || tagName === "DIV") {
        const text = el.textContent || "";
        const trimmed = text.trim();
        if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
          const li = doc.createElement("li");
          const content = el.innerHTML.replace(/^\s*[•\-*]\s*/, "");
          li.innerHTML = content;
          el.parentNode?.replaceChild(li, el);
          return;
        }
      }
      
      if (tagName === "A") {
        const href = el.getAttribute("href");
        el.removeAttribute("target");
        el.removeAttribute("rel");
        if (href) el.setAttribute("href", href);
      }
    }
    const children = Array.from(node.childNodes);
    children.forEach(cleanNode);
  };

  doc.body.childNodes.forEach(cleanNode);

  // Group sibling LIs in the document under UL
  const wrapListItems = (root: HTMLElement | Document) => {
    const lis = Array.from(root.querySelectorAll("li"));
    lis.forEach(li => {
      const parent = li.parentNode;
      if (parent && parent.nodeName !== "UL" && parent.nodeName !== "OL") {
        const siblings = Array.from(parent.childNodes);
        const index = siblings.indexOf(li);
        if (index === -1) return;

        const consecutiveLIs: HTMLElement[] = [];
        let nextIndex = index;
        while (nextIndex < siblings.length) {
          const nextNode = siblings[nextIndex];
          if (nextNode.nodeType === Node.ELEMENT_NODE && (nextNode as HTMLElement).tagName === "LI") {
            consecutiveLIs.push(nextNode as HTMLElement);
            nextIndex++;
          } else if (nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent?.trim() === "") {
            nextIndex++;
          } else {
            break;
          }
        }

        const ul = li.ownerDocument.createElement("ul");
        ul.className = "list-disc pl-5";
        parent.insertBefore(ul, consecutiveLIs[0]);
        consecutiveLIs.forEach(item => {
          ul.appendChild(item);
        });
      }
    });
  };

  wrapListItems(doc);

  // Normalize all UL and OL tags to have standard list classes
  const uls = Array.from(doc.querySelectorAll("ul"));
  uls.forEach(ul => {
    ul.removeAttribute("class");
    ul.removeAttribute("style");
    ul.className = "list-disc pl-5";
  });

  const ols = Array.from(doc.querySelectorAll("ol"));
  ols.forEach(ol => {
    ol.removeAttribute("class");
    ol.removeAttribute("style");
    ol.className = "list-decimal pl-5";
  });

  return doc.body.innerHTML;
};

export function UnifiedJobDetailsEditor({
  description,
  onChangeDescription,
  rolesResponsibilities,
  onChangeRolesResponsibilities,
  requirements,
  onChangeRequirements,
  className,
}: UnifiedJobDetailsEditorProps) {
  const descRef = useRef<HTMLDivElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);
  const reqsRef = useRef<HTMLDivElement>(null);

  const [activeEditor, setActiveEditor] = useState<"desc" | "roles" | "reqs" | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(defaultFormats);

  const isFirstMountDesc = useRef(true);
  const isFirstMountRoles = useRef(true);
  const isFirstMountReqs = useRef(true);

  // Sync internal innerHTML with external values
  useEffect(() => {
    if (descRef.current && document.activeElement !== descRef.current) {
      const currentHTML = descRef.current.innerHTML;
      if (isFirstMountDesc.current || currentHTML !== description) {
        descRef.current.innerHTML = description || "";
        isFirstMountDesc.current = false;
      }
    }
  }, [description]);

  useEffect(() => {
    if (rolesRef.current && document.activeElement !== rolesRef.current) {
      const currentHTML = rolesRef.current.innerHTML;
      if (isFirstMountRoles.current || currentHTML !== rolesResponsibilities) {
        rolesRef.current.innerHTML = rolesResponsibilities || "";
        isFirstMountRoles.current = false;
      }
    }
  }, [rolesResponsibilities]);

  useEffect(() => {
    if (reqsRef.current && document.activeElement !== reqsRef.current) {
      const currentHTML = reqsRef.current.innerHTML;
      if (isFirstMountReqs.current || currentHTML !== requirements) {
        reqsRef.current.innerHTML = requirements || "";
        isFirstMountReqs.current = false;
      }
    }
  }, [requirements]);

  const getActiveRef = useCallback(() => {
    if (activeEditor === "desc") return descRef;
    if (activeEditor === "roles") return rolesRef;
    if (activeEditor === "reqs") return reqsRef;
    return null;
  }, [activeEditor]);

  // Query formatting state at caret position
  const updateActiveFormats = useCallback(() => {
    const sel = window.getSelection();
    const activeRef = getActiveRef();
    if (!sel || !activeRef?.current || !activeRef.current.contains(sel.anchorNode)) {
      return;
    }

    let currentBlock = "";
    let node: Node | null = sel.anchorNode;
    while (node && node !== activeRef.current) {
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
  }, [getActiveRef]);

  useEffect(() => {
    const onSelectionChange = () => {
      const activeRef = getActiveRef();
      if (activeRef?.current && activeRef.current.contains(document.activeElement)) {
        updateActiveFormats();
      }
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [getActiveRef, updateActiveFormats]);

  const handleInput = (type: "desc" | "roles" | "reqs") => {
    if (type === "desc" && descRef.current) {
      onChangeDescription(descRef.current.innerHTML);
    } else if (type === "roles" && rolesRef.current) {
      onChangeRolesResponsibilities(rolesRef.current.innerHTML);
    } else if (type === "reqs" && reqsRef.current) {
      onChangeRequirements(reqsRef.current.innerHTML);
    }
    updateActiveFormats();
  };

  const executeCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (activeEditor) {
      handleInput(activeEditor);
    }
  };

  const toggleHeading = (tag: "h2" | "h3") => {
    const isActive = tag === "h2" ? activeFormats.h2 : activeFormats.h3;
    if (isActive) {
      document.execCommand("formatBlock", false, "<div>");
    } else {
      document.execCommand("formatBlock", false, `<${tag}>`);
    }
    if (activeEditor) {
      handleInput(activeEditor);
    }
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

  // Paste Event Handler (Formats external bullet points & cleans up styles)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>, type: "desc" | "roles" | "reqs") => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const html = e.clipboardData.getData("text/html");

    if (html) {
      const cleanHtml = cleanPastedHtml(html);
      document.execCommand("insertHTML", false, cleanHtml);
    } else {
      const lines = text.split(/\r?\n/);
      const hasBullets = lines.some(line => {
        const trimmed = line.trim();
        return trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+[.)]/.test(trimmed);
      });

      if (hasBullets) {
        let inList = false;
        let listType: "ul" | "ol" | null = null;
        let resultHtml = "";

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;

          const isUnordered = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*");
          const isOrdered = /^\d+[.)]/.test(trimmed);

          if (isUnordered || isOrdered) {
            const expectedListType = isUnordered ? "ul" : "ol";
            if (!inList || listType !== expectedListType) {
              if (inList) resultHtml += `</${listType}>`;
              resultHtml += `<${expectedListType} class="${expectedListType === "ol" ? "list-decimal pl-5" : "list-disc pl-5"}">`;
              inList = true;
              listType = expectedListType;
            }
            let content = trimmed;
            if (isUnordered) {
              content = trimmed.replace(/^[•\-*]\s*/, "");
            } else {
              content = trimmed.replace(/^\d+[.)]\s*/, "");
            }
            resultHtml += `<li>${content}</li>`;
          } else {
            if (inList) {
              resultHtml += `</${listType}>`;
              inList = false;
              listType = null;
            }
            resultHtml += `<p>${trimmed}</p>`;
          }
        });
        if (inList) resultHtml += `</${listType}>`;

        document.execCommand("insertHTML", false, resultHtml);
      } else {
        document.execCommand("insertText", false, text);
      }
    }

    handleInput(type);
  };

  // Keyboard Event Handler (Handles smooth line merges/deletes on backspace)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, type: "desc" | "roles" | "reqs") => {
    const activeRef = getActiveRef();
    if (!activeRef?.current) return;

    if (e.key === "Backspace") {
      const selection = window.getSelection();
      if (!selection || !selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const container = range.startContainer;

      let blockNode = container;
      while (blockNode && blockNode.parentNode !== activeRef.current) {
        blockNode = blockNode.parentNode!;
      }

      if (blockNode) {
        const isAtStart = isAtStartOfNode(range, blockNode);
        
        if (isAtStart) {
          const prevBlock = getPreviousSignificantSibling(blockNode) as HTMLElement | null;
          if (prevBlock && isEmptyBlock(prevBlock)) {
            e.preventDefault();
            prevBlock.remove();
            handleInput(type);
          }
        }
      }
    }
  };

  // Placeholders evaluation
  const cleanDesc = description ? description.replace(/<[^>]*>/g, "").trim() : "";
  const showDescPlaceholder = !cleanDesc;

  const cleanRoles = rolesResponsibilities ? rolesResponsibilities.replace(/<[^>]*>/g, "").trim() : "";
  const showRolesPlaceholder = !cleanRoles;

  const cleanReqs = requirements ? requirements.replace(/<[^>]*>/g, "").trim() : "";
  const showReqsPlaceholder = !cleanReqs;

  const btnBase = "p-1.5 rounded transition-colors";
  const btnActive = "bg-[#FF2B2B]/10 text-[#FF2B2B]";
  const btnInactive = "hover:bg-gray-200 text-gray-700";

  return (
    <div
      className={cn(
        "border border-gray-200 rounded-xl overflow-hidden bg-white transition-all duration-200",
        isFocused
          ? "border-ring/80 ring-1 ring-[#FF2B2B]/30 shadow-sm"
          : "hover:border-gray-300",
        className
      )}
    >
      {/* Shared Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-[#F9FAFB] border-b border-gray-200 px-3 py-1.5 select-none">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand("bold");
          }}
          className={cn(btnBase, activeFormats.bold ? btnActive : btnInactive)}
          title="Bold"
          disabled={!activeEditor}
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
          disabled={!activeEditor}
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
          disabled={!activeEditor}
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
          disabled={!activeEditor}
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
          disabled={!activeEditor}
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
          disabled={!activeEditor}
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
          disabled={!activeEditor}
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
          disabled={!activeEditor}
        >
          <LinkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Unified Editor frame: One single continuous light gray background */}
      <div className="bg-[#F6F6F6] p-6 space-y-3">
        
        {/* SECTION 1: About the Role */}
        <div className="space-y-1">
          <div className="text-[15px] font-bold text-[#3A1F1F]">About the Role</div>
          <div className="relative">
            {showDescPlaceholder && (
              <div 
                className="absolute top-1 left-0 text-sm text-[#8A8A8A] pointer-events-none select-none"
                style={{ textShadow: "0px 1px 1px rgba(255, 255, 255, 0.8)" }}
              >
                Enter about role...
              </div>
            )}
            <div
              ref={descRef}
              contentEditable
              onInput={() => handleInput("desc")}
              onFocus={() => {
                setIsFocused(true);
                setActiveEditor("desc");
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
              onPaste={(e) => handlePaste(e, "desc")}
              onKeyDown={(e) => handleKeyDown(e, "desc")}
              onKeyUp={updateActiveFormats}
              onMouseUp={updateActiveFormats}
              className="rich-text-content py-1 outline-none text-sm text-[#3A1F1F] min-h-[50px] w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
            />
          </div>
        </div>

        {/* SECTION 2: Roles & Responsibilities */}
        <div className="space-y-1 mt-4">
          <div className="text-[15px] font-bold text-[#3A1F1F]">Roles & Responsibilities</div>
          <div className="relative">
            {showRolesPlaceholder && (
              <div 
                className="absolute top-1 left-0 text-sm text-[#8A8A8A] pointer-events-none select-none"
                style={{ textShadow: "0px 1px 1px rgba(255, 255, 255, 0.8)" }}
              >
                Enter roles & responsibilities...
              </div>
            )}
            <div
              ref={rolesRef}
              contentEditable
              onInput={() => handleInput("roles")}
              onFocus={() => {
                setIsFocused(true);
                setActiveEditor("roles");
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
              onPaste={(e) => handlePaste(e, "roles")}
              onKeyDown={(e) => handleKeyDown(e, "roles")}
              onKeyUp={updateActiveFormats}
              onMouseUp={updateActiveFormats}
              className="rich-text-content py-1 outline-none text-sm text-[#3A1F1F] min-h-[60px] w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
            />
          </div>
        </div>

        {/* SECTION 3: Requirements / Qualifications */}
        <div className="space-y-1 mt-4">
          <div className="text-[15px] font-bold text-[#3A1F1F]">Requirements / Qualifications</div>
          <div className="relative">
            {showReqsPlaceholder && (
              <div 
                className="absolute top-1 left-0 text-sm text-[#8A8A8A] pointer-events-none select-none"
                style={{ textShadow: "0px 1px 1px rgba(255, 255, 255, 0.8)" }}
              >
                Enter requirements & qualifications...
              </div>
            )}
            <div
              ref={reqsRef}
              contentEditable
              onInput={() => handleInput("reqs")}
              onFocus={() => {
                setIsFocused(true);
                setActiveEditor("reqs");
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
              onPaste={(e) => handlePaste(e, "reqs")}
              onKeyDown={(e) => handleKeyDown(e, "reqs")}
              onKeyUp={updateActiveFormats}
              onMouseUp={updateActiveFormats}
              className="rich-text-content py-1 outline-none text-sm text-[#3A1F1F] min-h-[60px] w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-1.5 [&_h3]:mb-1 [&_a]:text-[#FF2B2B] [&_a]:underline"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
