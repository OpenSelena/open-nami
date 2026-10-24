#!/usr/bin/env node
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// package.json
var require_package = __commonJS({
  "package.json"(exports, module) {
    module.exports = {
      name: "open-nami",
      version: "1.6.0",
      description: "Open Nami: terminal-first bulk social media profile downloader for Instagram, TikTok, Facebook & X.",
      type: "module",
      bin: {
        "open-nami": "dist/cli.js",
        opennami: "dist/cli.js",
        nami: "dist/cli.js",
        on: "dist/cli.js"
      },
      files: [
        "dist/cli.js"
      ],
      engines: {
        node: ">=20"
      },
      scripts: {
        build: "tsup",
        dev: "tsup --watch",
        test: "node scripts/run-tests.js",
        typecheck: "tsc --noEmit",
        start: "node dist/cli.js",
        "build:pypi": "node scripts/build-pypi-bundle.js && python -m build pypi",
        prepublishOnly: "npm test && npm run typecheck && npm run build"
      },
      keywords: [
        "profile",
        "downloader",
        "gallery-dl",
        "yt-dlp",
        "instagram",
        "tiktok",
        "facebook",
        "twitter",
        "cli",
        "tui",
        "ink"
      ],
      license: "MIT",
      author: {
        name: "Igect",
        url: "https://igect.link/"
      },
      repository: {
        type: "git",
        url: "https://github.com/OpenSelena/open-nami.git"
      },
      dependencies: {
        ink: "^7.1.1",
        "ink-select-input": "^6.2.0",
        "ink-spinner": "^5.0.0",
        react: "^19.3.0"
      },
      devDependencies: {
        "@types/node": "^26.6.2",
        "@types/react": "^19.3.0",
        tsup: "^8.5.1",
        tsx: "^4.23.13",
        typescript: "^7.0.2"
      }
    };
  }
});

// src/cli.tsx
import { createRequire as createRequire2 } from "module";
import { render } from "ink";

// src/app.tsx
import { useState as useState10, useCallback as useCallback4, useRef as useRef5, useEffect as useEffect10, useMemo as useMemo3 } from "react";
import { Box as Box15, Text as Text17, useApp, useInput as useInput5, useStdout as useStdout3 } from "ink";
import Spinner4 from "ink-spinner";

// src/components/fullscreen.tsx
import { useEffect, useState } from "react";
import { Box, useStdout } from "ink";

// src/theme.ts
import React, { createContext, useContext } from "react";
var THEME_MODES = ["auto", "light", "dark"];
var BRAND_COLOR = "#C15F3C";
var themes = {
  auto: {
    mode: "auto",
    // Leaving colors unset is more reliable than trying to detect whether a
    // terminal is light or dark. ANSI defaults already follow its theme.
    primary: void 0,
    gray: void 0,
    dark: void 0,
    background: void 0,
    dimSecondary: true,
    inverseButton: true
  },
  light: {
    mode: "light",
    primary: "#18181b",
    gray: "#52525b",
    dark: "#ffffff",
    background: "#ffffff",
    dimSecondary: false,
    inverseButton: false
  },
  dark: {
    mode: "dark",
    primary: "#ffffff",
    gray: "#a1a1aa",
    dark: "#18181b",
    background: "#18181b",
    dimSecondary: false,
    inverseButton: false
  }
};
var ThemeContext = createContext(themes.auto);
function themeFor(mode) {
  return themes[mode];
}
function ThemeProvider({ mode, children }) {
  return React.createElement(ThemeContext.Provider, { value: themeFor(mode) }, children);
}
function useTheme() {
  return useContext(ThemeContext);
}
function nextThemeMode(mode) {
  return THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length];
}

// src/components/fullscreen.tsx
import { jsx } from "react/jsx-runtime";
function FullScreen({ children }) {
  const theme = useTheme();
  const { stdout } = useStdout();
  const dimensions = () => ({
    columns: stdout?.columns && stdout.columns > 0 ? stdout.columns : 80,
    rows: stdout?.rows && stdout.rows > 1 ? stdout.rows : 24
  });
  const [size, setSize] = useState(dimensions);
  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setSize(dimensions());
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return /* @__PURE__ */ jsx(
    Box,
    {
      width: size.columns,
      height: size.rows - 1,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
      children: /* @__PURE__ */ jsx(Box, { flexDirection: "column", alignItems: "center", flexShrink: 0, children })
    }
  );
}

// src/components/logo.tsx
import { useEffect as useEffect2, useMemo, useState as useState2 } from "react";
import { Box as Box2, Text } from "ink";
import { jsx as jsx2 } from "react/jsx-runtime";
var ART = [
  "\u2588\u2580\u2588 \u2588\u2580\u2588 \u2588\u2580\u2580 \u2588\u2580\u2584\u2588  \u2588\u2580\u2584\u2588 \u2588\u2580\u2588 \u2588\u2580\u2584\u2580\u2588 \u2580\u2588\u2580",
  "\u2588 \u2593 \u2588\u2580\u2593 \u2588\u2580\u2593 \u2588  \u2593  \u2588  \u2593 \u2588\u2580\u2588 \u2588 \u2593 \u2588  \u2593 ",
  "\u2580\u2580\u2580 \u2580   \u2580\u2580\u2580 \u2580  \u2580  \u2580  \u2580 \u2580 \u2580 \u2580   \u2580 \u2580\u2580\u2580"
];
var GRID = ART.map((line) => [...line]);
var ROWS = GRID.length;
var INTRO_MS = 900;
var INTRO_SPREAD_MS = 550;
var SWEEP_MS = 1e3;
var SWEEP_EVERY_MS = 7e3;
var TILT = 2;
var HALF = 2.4;
var LIGHTER = { "\u2588": "\u2592", "\u2593": "\u2591" };
var HALF_BLOCKS = /* @__PURE__ */ new Set(["\u2580", "\u2584"]);
var ease = (t) => 1 - Math.pow(1 - t, 3);
var LOGO_COLOR = BRAND_COLOR;
function cellAt(ch, row, col, phase, t, delay, theme) {
  if (ch === " " || phase === "idle") return { ch, color: LOGO_COLOR, dim: false };
  if (phase === "intro") {
    const dt = t - delay;
    if (dt < 0) return { ch: " ", color: LOGO_COLOR, dim: false };
    if (dt < 110) return { ch: HALF_BLOCKS.has(ch) ? ch : "\u2591", color: theme.gray, dim: theme.dimSecondary };
    if (dt < 220) return { ch: HALF_BLOCKS.has(ch) ? ch : "\u2592", color: theme.gray, dim: theme.dimSecondary };
    return { ch, color: LOGO_COLOR, dim: false };
  }
  const cols = GRID[0].length;
  const pMin = -TILT * ROWS - HALF;
  const pMax = cols + HALF;
  const p = pMin + ease(t / SWEEP_MS) * (pMax - pMin);
  const d = Math.abs(col - (ROWS - 1 - row) * TILT - p);
  if (d <= HALF && 1 - d / HALF > 0.35) {
    if (HALF_BLOCKS.has(ch)) return { ch, color: theme.gray, dim: theme.dimSecondary };
    return { ch: LIGHTER[ch] ?? ch, color: LOGO_COLOR, dim: false };
  }
  return { ch, color: LOGO_COLOR, dim: false };
}
function renderRow(row, phase, t, delays, theme) {
  const segments = [];
  GRID[row].forEach((ch, col) => {
    const cell = cellAt(ch, row, col, phase, t, delays[col], theme);
    const last = segments[segments.length - 1];
    if (last && (last.color === cell.color && last.dim === cell.dim || cell.ch === " ")) last.text += cell.ch;
    else segments.push({ text: cell.ch, color: cell.color, dim: cell.dim });
  });
  return /* @__PURE__ */ jsx2(Text, { children: segments.map((s, i) => /* @__PURE__ */ jsx2(Text, { color: s.color, dimColor: s.dim, children: s.text }, i)) }, row);
}
function Logo() {
  const theme = useTheme();
  const animated = Boolean(process.stdout.isTTY);
  const delays = useMemo(
    () => GRID.map((row) => row.map(() => Math.random() * INTRO_SPREAD_MS)),
    []
  );
  const [phase, setPhase] = useState2(animated ? "intro" : "idle");
  const [t, setT] = useState2(0);
  useEffect2(() => {
    if (!animated) return;
    if (phase === "idle") {
      const id2 = setTimeout(() => {
        setT(0);
        setPhase("sweep");
      }, SWEEP_EVERY_MS);
      return () => clearTimeout(id2);
    }
    const duration = phase === "intro" ? INTRO_MS : SWEEP_MS;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) {
        setT(0);
        setPhase("idle");
      } else {
        setT(elapsed);
      }
    }, 33);
    return () => clearInterval(id);
  }, [phase, animated]);
  return /* @__PURE__ */ jsx2(Box2, { flexDirection: "column", flexShrink: 0, children: GRID.map((_, row) => renderRow(row, phase, t, delays[row], theme)) });
}

// src/components/shortcuts.tsx
import { Text as Text2 } from "ink";
import { Fragment, jsx as jsx3, jsxs } from "react/jsx-runtime";
function Shortcuts({ items, leading }) {
  const theme = useTheme();
  return /* @__PURE__ */ jsxs(Text2, { children: [
    leading ? /* @__PURE__ */ jsxs(Fragment, { children: [
      leading,
      /* @__PURE__ */ jsx3(Text2, { color: theme.gray, dimColor: theme.dimSecondary, children: "  \xB7  " })
    ] }) : null,
    items.map(([key, label], index) => /* @__PURE__ */ jsxs(Text2, { children: [
      index > 0 ? /* @__PURE__ */ jsx3(Text2, { color: theme.gray, dimColor: theme.dimSecondary, children: "  \xB7  " }) : null,
      /* @__PURE__ */ jsx3(Text2, { color: theme.primary, children: key }),
      /* @__PURE__ */ jsxs(Text2, { color: theme.gray, dimColor: theme.dimSecondary, children: [
        " ",
        label
      ] })
    ] }, `${key}-${label}`))
  ] });
}

// src/components/views/input-view.tsx
import { Box as Box4, Text as Text5 } from "ink";

// src/components/framed-input.tsx
import { Box as Box3, Text as Text3 } from "ink";
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
var frameButtonWidth = (label) => label.length + 4;
function FramedInput({
  title,
  width,
  button,
  buttonDim = false,
  children
}) {
  const theme = useTheme();
  const inner = Math.max(0, width - 2);
  const maxTitleLen = Math.max(0, inner - 4);
  const displayTitle = title.length > maxTitleLen ? title.slice(0, Math.max(0, maxTitleLen - 1)) + "\u2026" : title;
  const tail = Math.max(0, inner - displayTitle.length - 3);
  const buttonW = button ? frameButtonWidth(button) : 0;
  const fillColor = buttonDim ? theme.gray : theme.primary;
  return /* @__PURE__ */ jsxs2(Box3, { width: width + buttonW, children: [
    /* @__PURE__ */ jsxs2(Box3, { flexDirection: "column", width, children: [
      /* @__PURE__ */ jsxs2(Text3, { wrap: "truncate-end", children: [
        /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u256D\u2500 " }),
        /* @__PURE__ */ jsx4(Text3, { color: theme.primary, children: displayTitle }),
        /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: ` ${"\u2500".repeat(tail)}${button ? "\u2500" : "\u256E"}` })
      ] }),
      /* @__PURE__ */ jsxs2(Box3, { width, height: 1, overflow: "hidden", children: [
        /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u2502 " }),
        /* @__PURE__ */ jsx4(Text3, { color: theme.primary, children: "\u276F " }),
        /* @__PURE__ */ jsx4(Box3, { flexGrow: 1, height: 1, overflow: "hidden", children }),
        button ? null : /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: " \u2502" })
      ] }),
      /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: `\u2570${"\u2500".repeat(inner)}${button ? "\u2500" : "\u256F"}` })
    ] }),
    button ? /* @__PURE__ */ jsxs2(Box3, { flexDirection: "column", width: buttonW, children: [
      /* @__PURE__ */ jsx4(Text3, { bold: true, color: fillColor, dimColor: buttonDim && theme.dimSecondary, children: "\u2584".repeat(buttonW) }),
      /* @__PURE__ */ jsx4(
        Text3,
        {
          backgroundColor: theme.inverseButton ? void 0 : fillColor,
          color: theme.inverseButton ? void 0 : theme.dark,
          inverse: theme.inverseButton && !buttonDim,
          dimColor: buttonDim && theme.dimSecondary,
          bold: true,
          children: `  ${button}  `
        }
      ),
      /* @__PURE__ */ jsx4(Text3, { bold: true, color: fillColor, dimColor: buttonDim && theme.dimSecondary, children: "\u2580".repeat(buttonW) })
    ] }) : null
  ] });
}

// src/components/text-input.tsx
import { useRef as useRef2, useState as useState3 } from "react";
import { Text as Text4, useInput } from "ink";

// src/lib/use-mouse-click.ts
import { useEffect as useEffect3, useRef } from "react";
import { useStdin, useStdout as useStdout2 } from "ink";
var ENABLE = "\x1B[?1000h\x1B[?1006h";
var DISABLE = "\x1B[?1006l\x1B[?1000l";
var SGR_PRESS = /\u001B\[<(\d+);(\d+);(\d+)M/g;
function useMouseClick(onClick, isActive) {
  const handlerRef = useRef(onClick);
  handlerRef.current = onClick;
  const { stdin } = useStdin();
  const { stdout } = useStdout2();
  useEffect3(() => {
    if (!isActive || !stdin || !stdout || !process.stdin.isTTY) return;
    stdout.write(ENABLE);
    const onData = (data) => {
      for (const match of String(data).matchAll(SGR_PRESS)) {
        const [, button, x, y] = match;
        if (button === "0") handlerRef.current(Number(x), Number(y));
      }
    };
    stdin.on("data", onData);
    return () => {
      stdin.off("data", onData);
      stdout.write(DISABLE);
    };
  }, [isActive, stdin, stdout]);
}
var stripMouseReports = (value) => value.replace(/\u001B?\[?<\d+;\d+;\d+[Mm]/g, "");

// src/components/text-input.tsx
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
var wordLeft = (text, from) => {
  let i = from;
  while (i > 0 && !/\w/.test(text[i - 1])) i--;
  while (i > 0 && /\w/.test(text[i - 1])) i--;
  return i;
};
var wordRight = (text, from) => {
  let i = from;
  while (i < text.length && !/\w/.test(text[i])) i++;
  while (i < text.length && /\w/.test(text[i])) i++;
  return i;
};
function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = "",
  width = 40,
  history = [],
  submitOnPaste,
  onTab,
  focus = true,
  onArrowUp,
  onArrowDown
}) {
  const theme = useTheme();
  const [cursorState, setCursorState] = useState3(value.length);
  const [anchorState, setAnchorState] = useState3(null);
  const [historyPos, setHistoryPos] = useState3(null);
  const draftRef = useRef2("");
  const offsetRef = useRef2(0);
  const cursor = Math.min(cursorState, value.length);
  const anchor = anchorState === null ? null : Math.min(anchorState, value.length);
  const selection = anchor !== null && anchor !== cursor ? [Math.min(anchor, cursor), Math.max(anchor, cursor)] : null;
  const place = (position, selecting = false) => {
    if (selecting) {
      if (anchor === null) setAnchorState(cursor);
    } else {
      setAnchorState(null);
    }
    setCursorState(Math.max(0, Math.min(value.length, position)));
  };
  const edit = (next, position) => {
    setAnchorState(null);
    setCursorState(Math.max(0, Math.min(next.length, position)));
    setHistoryPos(null);
    onChange(next);
  };
  const recall = (text) => {
    setAnchorState(null);
    setCursorState(text.length);
    onChange(text);
  };
  const removeRange = (start, end) => edit(value.slice(0, start) + value.slice(end), start);
  useInput((input, key) => {
    if (key.return) {
      onSubmit?.(value);
      return;
    }
    if (key.tab) {
      onTab?.();
      return;
    }
    if (key.pageUp || key.pageDown) return;
    if (key.escape) {
      setAnchorState(null);
      return;
    }
    if (key.upArrow || key.downArrow) {
      if (history.length === 0) {
        if (key.upArrow) onArrowUp?.();
        if (key.downArrow) onArrowDown?.();
        return;
      }
      if (key.upArrow) {
        if (historyPos === null) draftRef.current = value;
        const next2 = historyPos === null ? 0 : Math.min(historyPos + 1, history.length - 1);
        if (next2 === historyPos) return;
        setHistoryPos(next2);
        recall(history[next2]);
      } else if (historyPos !== null) {
        const next2 = historyPos - 1;
        setHistoryPos(next2 < 0 ? null : next2);
        recall(next2 < 0 ? draftRef.current : history[next2]);
      }
      return;
    }
    if (key.home) return place(0);
    if (key.end) return place(value.length);
    if (key.leftArrow || key.rightArrow) {
      const dir = key.leftArrow ? -1 : 1;
      if (selection && !key.shift) return place(dir < 0 ? selection[0] : selection[1]);
      const byWord = key.meta || key.ctrl;
      const target = byWord ? dir < 0 ? wordLeft(value, cursor) : wordRight(value, cursor) : cursor + dir;
      return place(target, key.shift);
    }
    if (key.backspace) {
      if (selection) return removeRange(selection[0], selection[1]);
      return removeRange(key.meta ? wordLeft(value, cursor) : Math.max(0, cursor - 1), cursor);
    }
    if (key.delete) {
      if (selection) return removeRange(selection[0], selection[1]);
      return removeRange(cursor, key.meta ? wordRight(value, cursor) : Math.min(value.length, cursor + 1));
    }
    if (key.ctrl) {
      if (input === "a") return place(0);
      if (input === "e") return place(value.length);
      if (input === "u") return removeRange(0, selection ? selection[1] : cursor);
      if (input === "k") return removeRange(selection ? selection[0] : cursor, value.length);
      if (input === "w") {
        const end2 = selection ? selection[1] : cursor;
        return removeRange(wordLeft(value, selection ? selection[0] : cursor), end2);
      }
      return;
    }
    if (key.meta) {
      if (input === "b") return place(wordLeft(value, cursor));
      if (input === "f") return place(wordRight(value, cursor));
      return;
    }
    if (!input) return;
    const clean = stripMouseReports(input).replace(/[\x00-\x1f\x7f]/g, "");
    if (!clean) return;
    const [start, end] = selection ?? [cursor, cursor];
    const next = value.slice(0, start) + clean + value.slice(end);
    edit(next, start + clean.length);
    if (clean.length > 1 && value === "" && submitOnPaste?.(next.trim())) onSubmit?.(next);
  }, { isActive: Boolean(process.stdin.isTTY) && focus });
  const span = Math.max(8, width);
  let offset = Math.min(offsetRef.current, Math.max(0, value.length + 1 - span));
  if (cursor < offset) offset = cursor;
  if (cursor > offset + span - 1) offset = cursor - span + 1;
  offsetRef.current = offset;
  if (!focus) {
    if (!value) {
      return /* @__PURE__ */ jsx5(Text4, { color: theme.gray, dimColor: theme.dimSecondary, children: placeholder.slice(0, span - 1) });
    }
    const cells2 = Array.from({ length: Math.min(span, value.length - offset + 1) }, (_, column) => {
      const index = offset + column;
      return /* @__PURE__ */ jsx5(Text4, { color: theme.gray, dimColor: theme.dimSecondary, children: value[index] ?? " " }, index);
    });
    return /* @__PURE__ */ jsx5(Text4, { children: cells2 });
  }
  if (!value) {
    return /* @__PURE__ */ jsxs3(Text4, { children: [
      /* @__PURE__ */ jsx5(Text4, { inverse: true, children: " " }),
      /* @__PURE__ */ jsx5(Text4, { color: theme.gray, dimColor: theme.dimSecondary, children: placeholder.slice(0, span - 1) })
    ] });
  }
  const cells = Array.from({ length: Math.min(span, value.length - offset + 1) }, (_, column) => {
    const index = offset + column;
    const selected = selection !== null && index >= selection[0] && index < selection[1];
    const atCursor = selection === null && index === cursor;
    return /* @__PURE__ */ jsx5(Text4, { color: theme.primary, inverse: selected || atCursor, children: value[index] ?? " " }, index);
  });
  return /* @__PURE__ */ jsx5(Text4, { children: cells });
}

// src/lib/format.ts
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
}
function shortenPath(filepath, homedir, max = 60) {
  const pretty = filepath.startsWith(homedir) ? `~${filepath.slice(homedir.length)}` : filepath;
  if (pretty.length <= max) return pretty;
  const ext = /\.\w{1,5}$/.exec(pretty)?.[0] ?? "";
  return `${pretty.slice(0, max - ext.length - 1)}\u2026${ext}`;
}
function terminalLink(text, url) {
  return `\x1B]8;;${url}\x07${text}\x1B]8;;\x07`;
}
var ERROR_RULES = [
  {
    tokens: ["notfounderror", "could not be found", "not found", "user does not exist", "profile not found"],
    category: "not_found",
    message: "profile or user could not be found",
    hint: "verify username spelling, or the profile may be private, deleted, or login-restricted.",
    inlineText: "not found or has no content"
  },
  {
    tokens: ["login", "authrequired", "redirect to login", "checkpoint_required", "challenge_required", "bot verification"],
    category: "auth_required",
    message: "login required to access this media",
    hint: "stories, highlights, and private accounts require active cookies in your cookies folder.",
    inlineText: "login cookies required"
  },
  {
    tokens: ["429", "too many requests", "rate limit", "throttled"],
    category: "rate_limited",
    message: "rate limit reached (HTTP 429)",
    hint: "the platform is temporarily throttling requests. Please wait a minute or use cookies.",
    inlineText: "rate limit reached (HTTP 429)"
  },
  {
    tokens: ["private"],
    category: "private_account",
    message: "this account is private",
    hint: "valid cookies with an account that follows this user are required to download.",
    inlineText: "account is private"
  }
];
function classifyEngineError(raw) {
  const lower = raw.toLowerCase();
  for (const rule of ERROR_RULES) {
    if (rule.tokens.some((t) => lower.includes(t))) {
      return {
        category: rule.category,
        message: rule.message,
        hint: rule.hint,
        inlineText: rule.inlineText
      };
    }
  }
  const clean = raw.replace(/\[[^\]]+\]/g, "").replace(/^[:\s-]+/, "").trim();
  return {
    category: "generic",
    message: clean || "download failed",
    hint: "check your internet connection or verify the profile URL.",
    inlineText: clean || "download failed"
  };
}
function formatEngineError(raw) {
  const classified = classifyEngineError(raw);
  return {
    message: classified.message,
    hint: classified.hint
  };
}
function cleanInlineError(err) {
  const jobMatch = err.match(/^\[(Photos|Videos|Stories|Highlights)\]\s*(.*)/i);
  const jobPrefix = jobMatch ? `${jobMatch[1].toLowerCase()}: ` : "";
  const rest = jobMatch ? jobMatch[2] : err;
  const classified = classifyEngineError(rest);
  return `${jobPrefix}${classified.inlineText}`;
}

// src/components/views/input-view.tsx
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
function InputView({
  urlInput,
  setUrlInput,
  onSubmit,
  boxWidth,
  history = [],
  clipboardOffered,
  clipboardAccepted,
  clipboardUrl,
  warning,
  version = "1.0.0",
  releaseUrl,
  theme,
  buttonText,
  gapComponent: Gap2
}) {
  return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", alignItems: "center", children: [
    /* @__PURE__ */ jsx6(FramedInput, { title: "Paste a profile link", width: boxWidth, button: buttonText, children: /* @__PURE__ */ jsx6(
      TextInput,
      {
        value: urlInput,
        onChange: setUrlInput,
        onSubmit,
        placeholder: "https://instagram.com/profile or @profile\u2026",
        width: boxWidth - 6,
        history,
        onTab: () => {
          if (clipboardOffered && clipboardUrl) setUrlInput(clipboardUrl);
        }
      }
    ) }),
    warning ? /* @__PURE__ */ jsxs4(Text5, { color: theme.gray, dimColor: theme.dimSecondary, children: [
      "\u2717 ",
      warning
    ] }) : clipboardOffered ? /* @__PURE__ */ jsx6(Text5, { color: theme.gray, dimColor: theme.dimSecondary, children: "link in your clipboard: Tab to paste it" }) : clipboardAccepted ? /* @__PURE__ */ jsx6(Text5, { color: theme.gray, dimColor: theme.dimSecondary, children: "from your clipboard: \u21B5 to download it" }) : null,
    /* @__PURE__ */ jsx6(Gap2, {}),
    /* @__PURE__ */ jsxs4(Text5, { color: theme.gray, dimColor: theme.dimSecondary, children: [
      /* @__PURE__ */ jsx6(Text5, { color: BRAND_COLOR, underline: true, children: terminalLink(`v${version}`, releaseUrl) }),
      " \xB7 by ",
      /* @__PURE__ */ jsx6(Text5, { color: BRAND_COLOR, underline: true, children: terminalLink("OpenSelena", "https://github.com/OpenSelena") })
    ] })
  ] });
}

// src/components/views/platform-view.tsx
import { Box as Box7, Text as Text8 } from "ink";
import SelectInput2 from "ink-select-input";

// src/components/panel.tsx
import { Box as Box5, Text as Text6 } from "ink";
import { jsx as jsx7, jsxs as jsxs5 } from "react/jsx-runtime";
function Panel({ title, width, children }) {
  const theme = useTheme();
  const inner = Math.max(0, width - 2);
  const maxTitleLen = Math.max(0, inner - 4);
  const displayTitle = title.length > maxTitleLen ? title.slice(0, Math.max(0, maxTitleLen - 1)) + "\u2026" : title;
  const tail = Math.max(0, inner - displayTitle.length - 3);
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", width, children: [
    /* @__PURE__ */ jsxs5(Text6, { wrap: "truncate-end", children: [
      /* @__PURE__ */ jsx7(Text6, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u256D\u2500 " }),
      /* @__PURE__ */ jsx7(Text6, { color: theme.primary, children: displayTitle }),
      /* @__PURE__ */ jsx7(Text6, { color: theme.gray, dimColor: theme.dimSecondary, children: ` ${"\u2500".repeat(tail)}\u256E` })
    ] }),
    /* @__PURE__ */ jsx7(
      Box5,
      {
        width,
        borderStyle: "round",
        borderColor: theme.gray,
        borderDimColor: theme.dimSecondary,
        borderBackgroundColor: theme.background,
        borderTop: false,
        flexDirection: "column",
        paddingX: 2,
        children
      }
    )
  ] });
}

// src/components/views/picking-view.tsx
import { useState as useState4, useEffect as useEffect4 } from "react";
import { Box as Box6, Text as Text7 } from "ink";
import SelectInput from "ink-select-input";

// src/lib/engines/checkpoint.ts
import fsPromises from "fs/promises";
import path from "path";
var CHECKPOINT_FILENAME = ".open-nami-checkpoint.json";
async function loadCheckpoint(destDir) {
  const filePath = path.join(destDir, CHECKPOINT_FILENAME);
  try {
    const raw = await fsPromises.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.cursors) {
      return parsed;
    }
  } catch {
  }
  return null;
}
async function saveCheckpoint(destDir, checkpoint) {
  const filePath = path.join(destDir, CHECKPOINT_FILENAME);
  const tmpPath = `${filePath}.tmp`;
  try {
    await fsPromises.mkdir(destDir, { recursive: true });
    await fsPromises.writeFile(tmpPath, JSON.stringify(checkpoint, null, 2), "utf-8");
    await fsPromises.rename(tmpPath, filePath);
  } catch {
  }
}
async function clearCheckpoint(destDir) {
  const filePath = path.join(destDir, CHECKPOINT_FILENAME);
  try {
    await fsPromises.unlink(filePath);
  } catch {
  }
}

// src/lib/engines/dispatcher.ts
import path13 from "path";
import fs13 from "fs/promises";

// src/lib/config.ts
import fs from "fs";
import path2 from "path";
import os from "os";
function getDefaultConfigPath() {
  if (process.env.OPEN_NAMI_CONFIG && process.env.OPEN_NAMI_CONFIG.trim()) {
    return path2.resolve(process.env.OPEN_NAMI_CONFIG.trim());
  }
  return path2.join(os.homedir(), ".open-nami", "config.json");
}
function loadConfig(configPath = getDefaultConfigPath()) {
  try {
    if (!fs.existsSync(configPath)) return {};
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      let cookiesFromBrowser = "auto";
      if (typeof parsed.cookiesFromBrowser === "string") {
        const trimmed = parsed.cookiesFromBrowser.trim();
        const lower = trimmed.toLowerCase();
        if (lower === "none") {
          cookiesFromBrowser = "none";
        } else if (lower === "auto" || trimmed === "") {
          cookiesFromBrowser = "auto";
        } else {
          const knownBrowsers = ["chrome", "edge", "brave", "firefox", "helium", "opera", "vivaldi"];
          cookiesFromBrowser = knownBrowsers.includes(lower) ? lower : trimmed;
        }
      } else {
        cookiesFromBrowser = "auto";
      }
      return {
        theme: typeof parsed.theme === "string" ? parsed.theme : void 0,
        cookiesDir: typeof parsed.cookiesDir === "string" ? parsed.cookiesDir.trim() : void 0,
        cookiesFromBrowser,
        downloadDir: typeof parsed.downloadDir === "string" ? parsed.downloadDir.trim() : void 0,
        writeMetadata: typeof parsed.writeMetadata === "boolean" ? parsed.writeMetadata : void 0,
        defaultLimit: typeof parsed.defaultLimit === "number" ? parsed.defaultLimit : void 0
      };
    }
  } catch {
  }
  return {};
}
function saveConfig(config, configPath = getDefaultConfigPath()) {
  try {
    const dir = path2.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 448 });
    }
    const data = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, data, { encoding: "utf8", mode: 384 });
  } catch {
  }
}

// src/lib/cookies.ts
import fs3 from "fs";
import fsPromises2 from "fs/promises";
import path4 from "path";
import os3 from "os";

// src/lib/cookies/browser-bridge.ts
import { execSync } from "child_process";
import fs2 from "fs";
import os2 from "os";
import path3 from "path";
function listDetectedBrowsers() {
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";
  const home = os2.homedir();
  const candidates = [
    {
      id: "chrome",
      name: "Google Chrome",
      winDir: path3.join(
        process.env.LOCALAPPDATA || path3.join(home, "AppData", "Local"),
        "Google",
        "Chrome",
        "User Data"
      ),
      macDir: path3.join(home, "Library", "Application Support", "Google", "Chrome"),
      linuxDir: path3.join(home, ".config", "google-chrome"),
      engine: "chrome"
    },
    {
      id: "edge",
      name: "Microsoft Edge",
      winDir: path3.join(
        process.env.LOCALAPPDATA || path3.join(home, "AppData", "Local"),
        "Microsoft",
        "Edge",
        "User Data"
      ),
      macDir: path3.join(home, "Library", "Application Support", "Microsoft Edge"),
      linuxDir: path3.join(home, ".config", "microsoft-edge"),
      engine: "edge"
    },
    {
      id: "brave",
      name: "Brave Browser",
      winDir: path3.join(
        process.env.LOCALAPPDATA || path3.join(home, "AppData", "Local"),
        "BraveSoftware",
        "Brave-Browser",
        "User Data"
      ),
      macDir: path3.join(home, "Library", "Application Support", "BraveSoftware", "Brave-Browser"),
      linuxDir: path3.join(home, ".config", "BraveSoftware", "Brave-Browser"),
      engine: "brave"
    },
    {
      id: "firefox",
      name: "Mozilla Firefox",
      winDir: path3.join(
        process.env.APPDATA || path3.join(home, "AppData", "Roaming"),
        "Mozilla",
        "Firefox",
        "Profiles"
      ),
      macDir: path3.join(home, "Library", "Application Support", "Firefox", "Profiles"),
      linuxDir: path3.join(home, ".mozilla", "firefox"),
      engine: "firefox"
    },
    {
      id: "helium",
      name: "Helium",
      winDir: path3.join(
        process.env.LOCALAPPDATA || path3.join(home, "AppData", "Local"),
        "imput",
        "Helium",
        "User Data"
      ),
      macDir: path3.join(home, "Library", "Application Support", "net.imput.Helium"),
      linuxDir: path3.join(home, ".config", "helium"),
      engine: "chrome"
    },
    {
      id: "opera",
      name: "Opera",
      winDir: path3.join(
        process.env.APPDATA || path3.join(home, "AppData", "Roaming"),
        "Opera Software",
        "Opera Stable"
      ),
      macDir: path3.join(home, "Library", "Application Support", "com.operasoftware.Opera"),
      linuxDir: path3.join(home, ".config", "opera"),
      engine: "opera"
    },
    {
      id: "vivaldi",
      name: "Vivaldi",
      winDir: path3.join(
        process.env.LOCALAPPDATA || path3.join(home, "AppData", "Local"),
        "Vivaldi",
        "User Data"
      ),
      macDir: path3.join(home, "Library", "Application Support", "Vivaldi"),
      linuxDir: path3.join(home, ".config", "vivaldi"),
      engine: "vivaldi"
    }
  ];
  return candidates.map((c) => {
    const profileDir = isWin ? c.winDir : isMac ? c.macDir : c.linuxDir;
    return {
      id: c.id,
      name: c.name,
      profileDir,
      available: fs2.existsSync(profileDir),
      engine: c.engine
    };
  });
}
function parseWindowsDefaultBrowserProgId(rawOutput) {
  if (!rawOutput) return null;
  const lines = rawOutput.split(/\r?\n/);
  const pattern = /^\s*ProgId\s+REG_\w+\s+(\S.*)$/i;
  for (const line of lines) {
    const match = line.match(pattern);
    if (match && match[1]) {
      const progId = match[1].trim();
      if (progId) return progId;
    }
  }
  return null;
}
function mapProgIdToBrowserId(progId, commandOutput, platformOverride = "win32") {
  const p = (progId || "").trim();
  const pLower = p.toLowerCase();
  const cmd = (commandOutput || "").toLowerCase();
  const isWin = platformOverride === "win32";
  const isMac = platformOverride === "darwin";
  const home = os2.homedir();
  const heliumDir = isWin ? path3.join(
    process.env.LOCALAPPDATA || path3.join(home, "AppData", "Local"),
    "imput",
    "Helium",
    "User Data"
  ) : isMac ? path3.join(home, "Library", "Application Support", "net.imput.Helium") : path3.join(home, ".config", "helium");
  if (pLower.includes("helium") || cmd.includes("helium")) {
    return {
      id: "helium",
      name: "Helium",
      engine: "chrome",
      profileDir: heliumDir
    };
  }
  if (pLower.startsWith("chromehtml") || pLower.includes("chrome") || cmd.includes("chrome.exe")) {
    return {
      id: "chrome",
      name: "Google Chrome",
      engine: "chrome"
    };
  }
  if (pLower.startsWith("msedge") || pLower.includes("edge") || pLower.startsWith("appxq0fevzme2pys62n3e0fbqsw5cj08ege9") || cmd.includes("msedge.exe")) {
    return {
      id: "edge",
      name: "Microsoft Edge",
      engine: "edge"
    };
  }
  if (pLower.startsWith("brave") || pLower.includes("brave") || cmd.includes("brave.exe")) {
    return {
      id: "brave",
      name: "Brave Browser",
      engine: "brave"
    };
  }
  if (pLower.startsWith("firefox") || pLower.includes("firefox") || cmd.includes("firefox.exe")) {
    return {
      id: "firefox",
      name: "Mozilla Firefox",
      engine: "firefox"
    };
  }
  if (pLower.startsWith("opera") || pLower.includes("opera") || cmd.includes("opera.exe")) {
    return {
      id: "opera",
      name: "Opera",
      engine: "opera"
    };
  }
  if (pLower.startsWith("vivaldi") || pLower.includes("vivaldi") || cmd.includes("vivaldi.exe")) {
    return {
      id: "vivaldi",
      name: "Vivaldi",
      engine: "vivaldi"
    };
  }
  return {
    id: pLower || "chromium",
    name: p || "Chromium",
    engine: "chromium"
  };
}
function parseMacDefaultBrowserBundleId(rawOutput) {
  if (!rawOutput) return null;
  const blocks = rawOutput.split(/[{}]/);
  let httpBundle = null;
  for (const block of blocks) {
    const isHttps = /LSHandlerURLScheme\s*=\s*https\b/i.test(block);
    const isHttp = /LSHandlerURLScheme\s*=\s*http\b/i.test(block);
    if (!isHttps && !isHttp) continue;
    const roleMatch = block.match(/LSHandlerRole(?:All|Viewer)\s*=\s*["']?([^"';\s]+)["']?/i);
    if (roleMatch && roleMatch[1]) {
      const bundleId = roleMatch[1].trim();
      if (isHttps) {
        return bundleId;
      }
      if (!httpBundle) {
        httpBundle = bundleId;
      }
    }
  }
  return httpBundle;
}
function mapBundleIdToBrowserId(bundleId) {
  const lower = bundleId.toLowerCase();
  if (lower.includes("helium")) {
    const home = os2.homedir();
    return {
      id: "helium",
      name: "Helium",
      engine: "chrome",
      profileDir: path3.join(home, "Library", "Application Support", "net.imput.Helium")
    };
  }
  if (lower.includes("chrome")) {
    return { id: "chrome", name: "Google Chrome", engine: "chrome" };
  }
  if (lower.includes("edge")) {
    return { id: "edge", name: "Microsoft Edge", engine: "edge" };
  }
  if (lower.includes("brave")) {
    return { id: "brave", name: "Brave Browser", engine: "brave" };
  }
  if (lower.includes("firefox")) {
    return { id: "firefox", name: "Mozilla Firefox", engine: "firefox" };
  }
  if (lower.includes("opera")) {
    return { id: "opera", name: "Opera", engine: "opera" };
  }
  if (lower.includes("vivaldi")) {
    return { id: "vivaldi", name: "Vivaldi", engine: "vivaldi" };
  }
  if (lower.includes("safari")) {
    return { id: "safari", name: "Safari", engine: "safari" };
  }
  return { id: lower, name: bundleId, engine: "chromium" };
}
function parseLinuxDefaultBrowserDesktop(rawOutput) {
  if (!rawOutput) return null;
  const lines = rawOutput.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("ERROR:") && !trimmed.includes("not found")) {
      return trimmed;
    }
  }
  return null;
}
function mapLinuxDesktopToBrowserId(desktopFile) {
  const lower = desktopFile.toLowerCase();
  if (lower.includes("helium")) {
    const home = os2.homedir();
    return {
      id: "helium",
      name: "Helium",
      engine: "chrome",
      profileDir: path3.join(home, ".config", "helium")
    };
  }
  if (lower.includes("chrome")) {
    return { id: "chrome", name: "Google Chrome", engine: "chrome" };
  }
  if (lower.includes("edge")) {
    return { id: "edge", name: "Microsoft Edge", engine: "edge" };
  }
  if (lower.includes("brave")) {
    return { id: "brave", name: "Brave Browser", engine: "brave" };
  }
  if (lower.includes("firefox")) {
    return { id: "firefox", name: "Mozilla Firefox", engine: "firefox" };
  }
  if (lower.includes("opera")) {
    return { id: "opera", name: "Opera", engine: "opera" };
  }
  if (lower.includes("vivaldi")) {
    return { id: "vivaldi", name: "Vivaldi", engine: "vivaldi" };
  }
  return { id: lower.replace(/\.desktop$/, ""), name: desktopFile, engine: "chromium" };
}
function queryWindows(execute, platformOverride) {
  let out = execute(
    'reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice" /v ProgId'
  );
  let progId = parseWindowsDefaultBrowserProgId(out);
  if (!progId) {
    out = execute(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId'
    );
    progId = parseWindowsDefaultBrowserProgId(out);
  }
  if (progId) {
    const cmdOut = execute(`reg query "HKCR\\${progId}\\shell\\open\\command"`);
    return mapProgIdToBrowserId(progId, cmdOut, platformOverride ?? "win32");
  }
  return null;
}
function queryMac(execute) {
  const out = execute(
    "defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers"
  );
  const bundleId = parseMacDefaultBrowserBundleId(out);
  if (bundleId) {
    return mapBundleIdToBrowserId(bundleId);
  }
  return null;
}
function queryLinux(execute) {
  let out = execute("xdg-settings get default-web-browser");
  let desktop = parseLinuxDefaultBrowserDesktop(out);
  if (!desktop) {
    out = execute("xdg-mime query default x-scheme-handler/https");
    desktop = parseLinuxDefaultBrowserDesktop(out);
  }
  if (!desktop) {
    out = execute("xdg-mime query default x-scheme-handler/http");
    desktop = parseLinuxDefaultBrowserDesktop(out);
  }
  if (desktop) {
    return mapLinuxDesktopToBrowserId(desktop);
  }
  return null;
}
function detectSystemDefaultBrowser(execFn, platformOverride) {
  const platform = platformOverride ?? process.platform;
  const execute = execFn ?? ((cmd) => {
    try {
      return execSync(cmd, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
        timeout: 2500
      });
    } catch {
      return "";
    }
  });
  let detectedInfo = null;
  if (platform === "win32") {
    detectedInfo = queryWindows(execute, platform);
  } else if (platform === "darwin") {
    detectedInfo = queryMac(execute);
  } else if (platform === "linux") {
    detectedInfo = queryLinux(execute);
  }
  if (!detectedInfo && execFn && !platformOverride) {
    if (platform !== "win32") detectedInfo = queryWindows(execute, "win32");
    if (!detectedInfo && platform !== "darwin") detectedInfo = queryMac(execute);
    if (!detectedInfo && platform !== "linux") detectedInfo = queryLinux(execute);
  }
  const allBrowsers = listDetectedBrowsers();
  if (detectedInfo) {
    const matched = allBrowsers.find((b) => b.id === detectedInfo.id);
    if (matched) {
      if (detectedInfo.profileDir) {
        return {
          ...matched,
          profileDir: detectedInfo.profileDir,
          available: fs2.existsSync(detectedInfo.profileDir)
        };
      }
      return matched;
    }
    const profDir = detectedInfo.profileDir || "";
    return {
      id: detectedInfo.id,
      name: detectedInfo.name || detectedInfo.id,
      profileDir: profDir,
      available: profDir ? fs2.existsSync(profDir) : false,
      engine: detectedInfo.engine
    };
  }
  const availableFallback = allBrowsers.find((b) => b.available);
  return availableFallback || null;
}
function resolveBrowserCookieArg(browser) {
  if (!browser) {
    return null;
  }
  if (typeof browser === "string") {
    const trimmed = browser.trim();
    if (!trimmed || trimmed.toLowerCase() === "none") {
      return null;
    }
    if (trimmed.toLowerCase() === "helium") {
      const detectedHelium = listDetectedBrowsers().find((b) => b.id === "helium");
      const profileDir = detectedHelium?.profileDir;
      return profileDir ? `chrome:${profileDir}` : "chrome";
    }
    if (trimmed.toLowerCase() === "auto") {
      const defaultBrowser = detectSystemDefaultBrowser();
      return resolveBrowserCookieArg(defaultBrowser);
    }
    return trimmed;
  }
  if (!browser.id || browser.id.toLowerCase() === "none") {
    return null;
  }
  if (browser.id.toLowerCase() === "helium") {
    const profileDir = browser.profileDir || listDetectedBrowsers().find((b) => b.id === "helium")?.profileDir;
    return profileDir ? `chrome:${profileDir}` : "chrome";
  }
  return browser.id;
}

// src/lib/cookies.ts
var CANDIDATE_DIRS = [
  path4.join(os3.homedir(), ".open-nami", "cookies"),
  path4.join(os3.homedir(), ".nami", "cookies"),
  path4.join(process.cwd(), "cookies")
];
function getCandidateDirs(customDir) {
  const dirs = [];
  const configured = loadConfig().cookiesDir;
  const custom = customDir || process.env.OPEN_NAMI_COOKIES_DIR || process.env.NAMI_COOKIES_DIR || configured;
  if (custom && custom.trim()) {
    dirs.push(path4.resolve(custom.trim()));
  }
  const seen = new Set(dirs.map((d) => path4.normalize(d).toLowerCase()));
  for (const dir of CANDIDATE_DIRS) {
    const norm = path4.normalize(dir).toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      dirs.push(dir);
    }
  }
  return dirs;
}
function findCookieFile(platform, customDir) {
  if (platform === "unknown") return null;
  const domainNames = {
    instagram: ["instagram.com_cookies.txt"],
    tiktok: ["tiktok.com_cookies.txt"],
    facebook: ["facebook.com_cookies.txt", "fb.com_cookies.txt"],
    x: ["x.com_cookies.txt", "twitter.com_cookies.txt"],
    unknown: []
  };
  const filenames = domainNames[platform] || [];
  const candidateDirs = getCandidateDirs(customDir);
  for (const dir of candidateDirs) {
    if (!fs3.existsSync(dir)) continue;
    for (const file of filenames) {
      const fullPath = path4.join(dir, file);
      if (fs3.existsSync(fullPath)) {
        try {
          const stats = fs3.statSync(fullPath);
          if (stats.size > 20) {
            return fullPath;
          }
        } catch {
        }
      }
    }
  }
  return null;
}
function detectAvailableCookies(customDir) {
  const platforms = ["instagram", "tiktok", "facebook", "x"];
  return platforms.filter((p) => Boolean(findCookieFile(p, customDir)));
}
async function createSafeCookieCopy(masterPath) {
  const userTempDir = path4.join(os3.homedir(), ".open-nami", "temp");
  let targetDir = userTempDir;
  try {
    await fsPromises2.mkdir(userTempDir, { recursive: true, mode: 448 });
  } catch {
    targetDir = os3.tmpdir();
  }
  const tempPath = path4.join(targetDir, `nami_cookie_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  await fsPromises2.copyFile(masterPath, tempPath);
  await fsPromises2.chmod(tempPath, 384).catch(() => {
  });
  return {
    filePath: tempPath,
    isTemporary: true,
    cleanup: async () => {
      try {
        await fsPromises2.unlink(tempPath);
      } catch {
      }
    }
  };
}

// src/lib/engines/extractors/instagram.ts
import crypto from "crypto";

// src/lib/engines/extractors/http.ts
import fs4 from "fs/promises";
import { setTimeout as setTimeoutPromise } from "timers/promises";
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var DEFAULT_CHROME_HEADERS = {
  "User-Agent": DEFAULT_USER_AGENT,
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9"
};
function parseNetscapeCookies(content, filterDomain) {
  const cookies = {};
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#HttpOnly_")) {
      line = line.slice("#HttpOnly_".length);
    } else if (line.startsWith("#")) {
      continue;
    }
    const parts = line.split("	");
    if (parts.length >= 7) {
      const domain = parts[0].toLowerCase();
      const name = parts[5];
      const value = parts[6];
      if (filterDomain) {
        const cleanDomain = filterDomain.toLowerCase().replace(/^\./, "");
        const lineDomain = domain.replace(/^\./, "");
        if (!lineDomain.endsWith(cleanDomain) && !cleanDomain.endsWith(lineDomain)) {
          continue;
        }
      }
      if (name) {
        cookies[name] = value;
      }
    }
  }
  return cookies;
}
async function loadCookiesFromPath(filePath, filterDomain) {
  try {
    const content = await fs4.readFile(filePath, "utf-8");
    return parseNetscapeCookies(content, filterDomain);
  } catch {
    return {};
  }
}
function formatCookieHeader(cookies) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}
async function sleep(minMs, maxMs, signal) {
  const ms = maxMs !== void 0 ? Math.floor(minMs + Math.random() * (maxMs - minMs)) : minMs;
  if (ms <= 0) return;
  if (signal?.aborted) {
    throw signal.reason ?? new Error("Aborted");
  }
  try {
    await setTimeoutPromise(ms, void 0, { signal });
  } catch (err) {
    if (signal?.aborted && signal.reason) {
      throw signal.reason;
    }
    throw err;
  }
}
function combineTimeoutSignal(signal, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) return signal;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}
var HttpClient = class {
  defaultCookies = {};
  defaultHeaders;
  cookieCache = /* @__PURE__ */ new Map();
  constructor(headers, cookies) {
    this.defaultHeaders = { ...DEFAULT_CHROME_HEADERS, ...headers };
    if (cookies) {
      this.defaultCookies = { ...cookies };
    }
  }
  setCookie(name, value) {
    this.defaultCookies[name] = value;
  }
  setHeader(name, value) {
    this.defaultHeaders[name] = value;
  }
  clearCookieCache() {
    this.cookieCache.clear();
  }
  async getCachedCookies(filePath, domain) {
    const cacheKey = `${filePath}::${domain || ""}`;
    const cached = this.cookieCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const loaded = await loadCookiesFromPath(filePath, domain);
    this.cookieCache.set(cacheKey, loaded);
    return loaded;
  }
  async loadCookies(filePath, domain) {
    const loaded = await this.getCachedCookies(filePath, domain);
    Object.assign(this.defaultCookies, loaded);
  }
  async request(url, options = {}) {
    const retries = options.retries ?? 1;
    const retryDelay = options.retryDelayMs ?? 1e3;
    let cookieHeader = "";
    if (options.cookiePath) {
      const fromPath = await this.getCachedCookies(options.cookiePath, options.cookieDomain);
      const merged = { ...this.defaultCookies, ...fromPath };
      cookieHeader = formatCookieHeader(merged);
    } else if (typeof options.cookies === "string") {
      cookieHeader = options.cookies;
    } else if (options.cookies) {
      const merged = { ...this.defaultCookies, ...options.cookies };
      cookieHeader = formatCookieHeader(merged);
    } else if (Object.keys(this.defaultCookies).length > 0) {
      cookieHeader = formatCookieHeader(this.defaultCookies);
    }
    const headers = {
      ...this.defaultHeaders,
      ...options.headers
    };
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (options.signal?.aborted) {
        throw options.signal.reason ?? new Error("Aborted");
      }
      const requestSignal = combineTimeoutSignal(options.signal || void 0, options.timeoutMs);
      try {
        const response = await fetch(url, {
          ...options,
          signal: requestSignal,
          headers
        });
        if (response.status === 429) {
          if (attempt < retries) {
            try {
              await response.body?.cancel();
            } catch {
            }
            const backoffMs = Math.min(retryDelay * (attempt + 1), 2500);
            await sleep(backoffMs, void 0, options.signal || void 0);
            continue;
          }
        }
        if (response.status >= 500 && attempt < retries) {
          try {
            await response.body?.cancel();
          } catch {
          }
          const backoffMs = Math.min(retryDelay * (attempt + 1), 2e3);
          await sleep(backoffMs, void 0, options.signal || void 0);
          continue;
        }
        return response;
      } catch (err) {
        lastError = err;
        if (options.signal?.aborted) throw err;
        if (attempt < retries) {
          await sleep(retryDelay * (attempt + 1), void 0, options.signal || void 0);
        }
      }
    }
    throw lastError ?? new Error(`Request failed after ${retries} attempts: ${url}`);
  }
  async fetchJson(url, options = {}) {
    const res = await this.request(url, {
      ...options,
      headers: {
        "Accept": "application/json, text/plain, */*",
        ...options.headers
      }
    });
    if (!res.ok) {
      try {
        await res.body?.cancel();
      } catch {
      }
      throw new Error(`HTTP ${res.status} (${res.statusText}) for ${url}`);
    }
    const text = await res.text();
    const cleanText = text.replace(/^\s*(?:for\s*\(\s*;\s*;\s*\);|\)\]\}',)/, "").trim();
    return JSON.parse(cleanText);
  }
  async fetchText(url, options = {}) {
    const res = await this.request(url, options);
    if (!res.ok) {
      try {
        await res.body?.cancel();
      } catch {
      }
      throw new Error(`HTTP ${res.status} (${res.statusText}) for ${url}`);
    }
    return await res.text();
  }
};

// src/lib/engines/extractors/instagram.ts
var IG_APP_ID = "936619743392459";
var IG_TIMELINE_QUERY_HASH = "69cba40317214236af40e7efa697781d";
var IG_QUERIES = {
  PolarisProfilePostsTabContentQuery_connection: "39229011733413759",
  PolarisProfileReelsTabContentQuery_connection: "28989741540630190",
  PolarisProfileTaggedTabContentQuery_connection: "28794602806842110",
  ProfileStoryHighlightsTrayContentQuery_connection: "38168009559465141",
  PolarisProfileStoryHighlightsTrayContentQuery: "38168009559465141",
  PolarisStoriesV3ReelPageGalleryQuery: "28262315486766731",
  PolarisStoriesV3TrayContainerQuery: "27703822975903310",
  PolarisProfilePageContentQuery: "28649589871350527"
};
var IG_POLARIS_DOC_ID = IG_QUERIES.PolarisProfilePostsTabContentQuery_connection;
function isExplicitAuthError(msg) {
  return msg.includes("401") || msg.includes("403") || msg.includes("login_required") || msg.includes("checkpoint_required") || msg.includes("not-logged-in");
}
function logExtractorDebug(endpoint, err) {
  if (process.env.DEBUG || process.env.OPEN_NAMI_DEBUG) {
    const message = err instanceof Error ? err.message : String(err);
    console.debug(`[open-nami:instagram] ${endpoint} query fallback: ${message}`);
  }
}
function parseIgNodeToMediaItems(node, username) {
  const items = [];
  const anyNode = node;
  const baseId = node.shortcode || node.id || anyNode.pk;
  const date = node.taken_at_timestamp || anyNode.taken_at;
  const caption = anyNode.edge_media_to_caption?.edges?.[0]?.node?.text || anyNode.caption?.text || (typeof anyNode.caption === "string" ? anyNode.caption : void 0);
  const childrenEdges = node.edge_sidecar_to_children?.edges;
  const carouselMedia = anyNode.carousel_media;
  const childrenList = childrenEdges ? childrenEdges.map((e) => e.node) : Array.isArray(carouselMedia) ? carouselMedia : [];
  if (childrenList.length > 0) {
    childrenList.forEach((childNode, index) => {
      const subItems = parseIgNodeToMediaItems(childNode, username);
      for (const item of subItems) {
        item.id = `${baseId}_${index + 1}`;
        item.filename = `${username}_${date ? `${date}_` : ""}${baseId}_${index + 1}`;
        item.author = username;
        item.platform = "instagram";
        item.caption = item.caption || caption;
        item.carouselId = baseId;
        item.carouselIndex = index + 1;
        item.carouselTotal = childrenList.length;
        items.push(item);
      }
    });
    return items;
  }
  const isVideo = Boolean(node.is_video || node.video_url || node.video_versions && node.video_versions.length > 0);
  if (isVideo) {
    const video = node.video_versions?.[0];
    const videoUrl = node.video_url || video?.url;
    if (videoUrl) {
      items.push({
        id: baseId,
        url: videoUrl,
        filename: `${username}_${date ? `${date}_` : ""}${baseId}`,
        extension: "mp4",
        type: "video",
        caption,
        author: username,
        platform: "instagram",
        date,
        width: video?.width ?? node.dimensions?.width,
        height: video?.height ?? node.dimensions?.height,
        thumbnailUrl: node.display_url
      });
    } else {
      const candidate = node.image_versions2?.candidates?.[0];
      const photoUrl = candidate?.url || node.display_url;
      if (photoUrl) {
        items.push({
          id: baseId,
          url: photoUrl,
          filename: `${username}_${date ? `${date}_` : ""}${baseId}`,
          extension: "jpg",
          type: "photo",
          caption,
          author: username,
          platform: "instagram",
          date,
          width: candidate?.width ?? node.dimensions?.width,
          height: candidate?.height ?? node.dimensions?.height
        });
      }
    }
  } else {
    const candidate = node.image_versions2?.candidates?.[0];
    const photoUrl = candidate?.url || node.display_url;
    if (photoUrl) {
      items.push({
        id: baseId,
        url: photoUrl,
        filename: `${username}_${date ? `${date}_` : ""}${baseId}`,
        extension: "jpg",
        type: "photo",
        caption,
        author: username,
        platform: "instagram",
        date,
        width: candidate?.width ?? node.dimensions?.width,
        height: candidate?.height ?? node.dimensions?.height
      });
    }
  }
  return items;
}
function parseReelItemToMediaItem(item, username) {
  const id = item.id || item.pk || String(Date.now());
  const date = item.taken_at || item.created_at;
  const caption = item.caption?.text || (typeof item.caption === "string" ? item.caption : void 0);
  const isVideo = item.media_type === 2 || Boolean(item.video_versions && item.video_versions.length > 0);
  if (isVideo) {
    const video = item.video_versions?.[0];
    const videoUrl = video?.url;
    if (!videoUrl) return null;
    return {
      id,
      url: videoUrl,
      filename: `${username}_${date ? `${date}_` : ""}${id}`,
      extension: "mp4",
      type: "video",
      caption,
      author: username,
      platform: "instagram",
      date,
      width: video?.width ?? item.original_width,
      height: video?.height ?? item.original_height,
      thumbnailUrl: item.image_versions2?.candidates?.[0]?.url
    };
  } else {
    const candidate = item.image_versions2?.candidates?.[0];
    const photoUrl = candidate?.url;
    if (!photoUrl) return null;
    return {
      id,
      url: photoUrl,
      filename: `${username}_${date ? `${date}_` : ""}${id}`,
      extension: "jpg",
      type: "photo",
      caption,
      author: username,
      platform: "instagram",
      date,
      width: candidate?.width ?? item.original_width,
      height: candidate?.height ?? item.original_height
    };
  }
}
var InstagramExtractor = class {
  platform = "instagram";
  httpClient;
  constructor(httpClient) {
    this.httpClient = httpClient ?? new HttpClient({
      "X-IG-App-ID": IG_APP_ID,
      "Referer": "https://www.instagram.com/"
    });
  }
  async fetchUserProfile(username, options) {
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const res = await this.httpClient.fetchJson(url, {
      cookiePath: options.cookiePath,
      cookieDomain: "instagram.com",
      signal: options.signal,
      retries: 0,
      timeoutMs: 4e3,
      headers: {
        "X-IG-App-ID": IG_APP_ID,
        "Referer": `https://www.instagram.com/${username}/`
      }
    });
    if (!res.data?.user) {
      throw new Error(`Instagram user not found or private profile: ${username}`);
    }
    const user = res.data.user;
    if (user.is_private) {
      const fs18 = user.friendship_status;
      const isFollowing = fs18 ? Boolean(fs18.following) : Boolean(user.followed_by_viewer);
      if (!isFollowing) {
        throw new Error(`Instagram profile @${username} is private. You must provide a session cookie jar of an account following this profile.`);
      }
    }
    return user;
  }
  async fetchHighlightsTray(userId, options, tokens) {
    let authError = null;
    try {
      const variables = JSON.stringify({ user_id: userId });
      const bodyParams = new URLSearchParams({
        av: "17841415137994167",
        __d: "www",
        __user: "0",
        __a: "1",
        __req: "0",
        __hs: "20731.HYP:instagram_web_pkg.2.1...0",
        dpr: "1",
        __ccg: "EXCELLENT",
        __rev: "1049285836",
        __hsi: "7693193318680449885",
        __comet_req: "7",
        jazoest: "26461",
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "ProfileStoryHighlightsTrayContentQuery_connection",
        server_timestamps: "true",
        variables,
        doc_id: IG_QUERIES.ProfileStoryHighlightsTrayContentQuery_connection
      });
      if (tokens?.fbDtsg) bodyParams.set("fb_dtsg", tokens.fbDtsg);
      if (tokens?.lsd) bodyParams.set("lsd", tokens.lsd);
      const headers = {
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-IG-App-ID": IG_APP_ID,
        "X-IG-Max-Touch-Points": "0",
        "X-FB-Friendly-Name": "ProfileStoryHighlightsTrayContentQuery_connection",
        "Referer": "https://www.instagram.com/",
        "Origin": "https://www.instagram.com",
        "X-ASBD-ID": "359341",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      };
      if (tokens?.csrfToken) headers["X-CSRFToken"] = tokens.csrfToken;
      if (tokens?.lsd) headers["X-FB-LSD"] = tokens.lsd;
      const res = await this.httpClient.fetchJson("https://www.instagram.com/api/graphql", {
        method: "POST",
        body: bodyParams.toString(),
        cookiePath: options.cookiePath,
        cookieDomain: "instagram.com",
        signal: options.signal,
        headers
      });
      const edges = res?.data?.highlights?.edges;
      if (Array.isArray(edges)) {
        if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
          logExtractorDebug("ProfileStoryHighlightsTrayContentQuery_connection partial field errors", res.errors);
        }
        return edges.map((e) => e.node).filter(Boolean);
      }
      if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
        const errMsg = res.errors.map((e) => e.message || JSON.stringify(e)).join("; ");
        if (isExplicitAuthError(errMsg)) {
          authError = new Error("Instagram Highlights require an active authenticated session. Your session cookie is missing or expired. Update your cookies in Settings (^s).");
        }
      }
    } catch (err) {
      logExtractorDebug("ProfileStoryHighlightsTrayContentQuery_connection", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (isExplicitAuthError(msg)) {
        authError = new Error("Instagram Highlights require an active authenticated session. Your session cookie is missing or expired. Update your cookies in Settings (^s).");
      }
    }
    const url = `https://www.instagram.com/api/v1/highlights/${userId}/highlights_tray/`;
    try {
      const res = await this.httpClient.fetchJson(url, {
        cookiePath: options.cookiePath,
        cookieDomain: "instagram.com",
        signal: options.signal,
        headers: {
          "X-IG-App-ID": IG_APP_ID,
          "Referer": "https://www.instagram.com/"
        }
      });
      if (res?.message === "login_required" || res?.message === "checkpoint_required") {
        throw new Error("Instagram Highlights require an active authenticated session. Your session cookie is missing or expired. Update your cookies in Settings (^s).");
      }
      return res?.tray ?? [];
    } catch (err) {
      logExtractorDebug("Highlights legacy REST", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (isExplicitAuthError(msg)) {
        throw new Error("Instagram Highlights require an active authenticated session. Your session cookie is missing or expired. Update your cookies in Settings (^s).");
      }
      if (authError) throw authError;
      return [];
    }
  }
  async fetchReelsMediaGraphQL(reelIds, options, tokens) {
    if (reelIds.length === 0) return [];
    try {
      const variables = JSON.stringify({
        initial_reel_id: reelIds[0],
        reel_ids: reelIds,
        first: 3,
        last: 2,
        __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider: true
      });
      const bodyParams = new URLSearchParams({
        av: "17841415137994167",
        __d: "www",
        __user: "0",
        __a: "1",
        __req: "0",
        __hs: "20731.HYP:instagram_web_pkg.2.1...0",
        dpr: "1",
        __ccg: "EXCELLENT",
        __rev: "1049285836",
        __hsi: "7693193318680449885",
        __comet_req: "7",
        jazoest: "26461",
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "PolarisStoriesV3ReelPageGalleryQuery",
        server_timestamps: "true",
        variables,
        doc_id: IG_QUERIES.PolarisStoriesV3ReelPageGalleryQuery
      });
      if (tokens?.fbDtsg) bodyParams.set("fb_dtsg", tokens.fbDtsg);
      if (tokens?.lsd) bodyParams.set("lsd", tokens.lsd);
      const headers = {
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-IG-App-ID": IG_APP_ID,
        "X-IG-Max-Touch-Points": "0",
        "X-FB-Friendly-Name": "PolarisStoriesV3ReelPageGalleryQuery",
        "Referer": "https://www.instagram.com/",
        "Origin": "https://www.instagram.com",
        "X-ASBD-ID": "359341",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      };
      if (tokens?.csrfToken) headers["X-CSRFToken"] = tokens.csrfToken;
      if (tokens?.lsd) headers["X-FB-LSD"] = tokens.lsd;
      const res = await this.httpClient.fetchJson("https://www.instagram.com/api/graphql", {
        method: "POST",
        body: bodyParams.toString(),
        cookiePath: options.cookiePath,
        cookieDomain: "instagram.com",
        signal: options.signal,
        headers
      });
      const connection = res?.data?.xdt_api__v1__feed__reels_media__connection;
      const edges = connection?.edges;
      if (Array.isArray(edges) && edges.length > 0) {
        return edges.map((e) => e.node).filter(Boolean);
      }
    } catch (err) {
      logExtractorDebug("PolarisStoriesV3ReelPageGalleryQuery", err);
    }
    return [];
  }
  async fetchReelsMedia(reelIds, options, tokens) {
    if (reelIds.length === 0) return [];
    const gqlReels = await this.fetchReelsMediaGraphQL(reelIds, options, tokens);
    if (gqlReels.length > 0) {
      return gqlReels;
    }
    const idsParam = reelIds.join(",");
    const url = `https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=${encodeURIComponent(idsParam)}`;
    try {
      const res = await this.httpClient.fetchJson(url, {
        cookiePath: options.cookiePath,
        cookieDomain: "instagram.com",
        signal: options.signal,
        headers: {
          "X-IG-App-ID": IG_APP_ID,
          "Referer": "https://www.instagram.com/"
        }
      });
      if (res?.message === "login_required" || res?.message === "checkpoint_required") {
        throw new Error("Instagram Stories require an active authenticated session. Your session cookie is missing or expired. Update your cookies in Settings (^s).");
      }
      if (res?.reels_media) return res.reels_media;
      if (res?.reels) return Object.values(res.reels);
      return [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isExplicitAuthError(msg)) {
        throw new Error("Instagram Stories require an active authenticated session. Your session cookie is missing or expired. Update your cookies in Settings (^s).");
      }
      logExtractorDebug("Reels media legacy REST", err);
      return [];
    }
  }
  async fetchWebTokens(username, options) {
    let csrfToken;
    if (options.cookiePath) {
      try {
        const cookies = await loadCookiesFromPath(options.cookiePath, "instagram.com");
        csrfToken = cookies["csrftoken"];
      } catch {
      }
    }
    if (!csrfToken) {
      csrfToken = crypto.randomBytes(16).toString("hex");
    }
    try {
      const html = await this.httpClient.fetchText(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
        cookiePath: options.cookiePath,
        cookieDomain: "instagram.com",
        signal: options.signal,
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      let lsd;
      let fbDtsg;
      let userId;
      const eqmcMatch = html.match(/id="__eqmc"[^>]*>([^<]+)<\/script>/);
      if (eqmcMatch) {
        try {
          const eqmc = JSON.parse(eqmcMatch[1]);
          if (eqmc.l) lsd = eqmc.l;
          if (eqmc.f) fbDtsg = eqmc.f;
        } catch {
        }
      }
      if (!lsd) {
        const m = html.match(/"lsd":"([^"]+)"/) || html.match(/"LSD",\[\],\{"token":"([^"]+)"/);
        if (m) lsd = m[1];
      }
      if (!fbDtsg) {
        const m = html.match(/"dtsg":\{"token":"([^"]+)"/);
        if (m) fbDtsg = m[1];
      }
      const uMatch = html.match(/"profile_id":"([^"]+)"/) || html.match(/"user_id":"([^"]+)"/);
      if (uMatch) userId = uMatch[1];
      return { lsd, fbDtsg, csrfToken, userId };
    } catch (err) {
      logExtractorDebug("fetchWebTokens", err);
      return { csrfToken };
    }
  }
  async fetchPostsTabGraphQL(username, cursor, tokens, options) {
    const postVariables = JSON.stringify({
      after: cursor || null,
      before: null,
      data: {
        count: 12,
        include_reel_media_seen_timestamp: true,
        include_relationship_info: true,
        latest_besties_reel_media: true,
        latest_reel_media: true
      },
      first: 12,
      include_multi_captions: true,
      last: null,
      username,
      __relay_internal__pv__PolarisMultiCaptionCarouselEnabledrelayprovider: true,
      __relay_internal__pv__PolarisShortDramaEnabledrelayprovider: true,
      __relay_internal__pv__PolarisThreadsStyleCommentsEnabledrelayprovider: false,
      __relay_internal__pv__PolarisReelsRecoDebugOverlayEnabledrelayprovider: false
    });
    const bodyParams = new URLSearchParams({
      av: "17841415137994167",
      __d: "www",
      __user: "0",
      __a: "1",
      __req: "0",
      __hs: "20731.HYP:instagram_web_pkg.2.1...0",
      dpr: "1",
      __ccg: "EXCELLENT",
      __rev: "1049285836",
      __hsi: "7693193318680449885",
      __comet_req: "7",
      jazoest: "26461",
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "PolarisProfilePostsTabContentQuery_connection",
      server_timestamps: "true",
      variables: postVariables,
      doc_id: IG_POLARIS_DOC_ID
    });
    if (tokens.fbDtsg) bodyParams.set("fb_dtsg", tokens.fbDtsg);
    if (tokens.lsd) bodyParams.set("lsd", tokens.lsd);
    const headers = {
      "Accept": "*/*",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-IG-App-ID": IG_APP_ID,
      "X-IG-Max-Touch-Points": "0",
      "X-FB-Friendly-Name": "PolarisProfilePostsTabContentQuery_connection",
      "Referer": `https://www.instagram.com/${username}/`,
      "Origin": "https://www.instagram.com",
      "X-ASBD-ID": "359341",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin"
    };
    if (tokens.csrfToken) headers["X-CSRFToken"] = tokens.csrfToken;
    if (tokens.lsd) headers["X-FB-LSD"] = tokens.lsd;
    const res = await this.httpClient.fetchJson("https://www.instagram.com/graphql/query", {
      method: "POST",
      body: bodyParams.toString(),
      cookiePath: options.cookiePath,
      cookieDomain: "instagram.com",
      signal: options.signal,
      headers
    });
    const connection = res?.data?.xdt_api__v1__feed__user_timeline_graphql_connection || res?.data?.user?.edge_owner_to_timeline_media;
    if (connection?.edges && Array.isArray(connection.edges) && connection.edges.length > 0) {
      if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
        logExtractorDebug("PolarisProfilePostsTabContentQuery partial field errors", res.errors);
      }
      let resolvedUserId;
      for (const edge of connection.edges) {
        const node = edge?.node;
        if (node?.owner_id) {
          if (typeof node.owner_id === "object" && node.owner_id !== null) {
            resolvedUserId = String(node.owner_id.pk || node.owner_id.id || "");
          } else {
            resolvedUserId = String(node.owner_id);
          }
          if (resolvedUserId && resolvedUserId !== "[object Object]") break;
        }
        if (node?.user?.pk || node?.user?.id) {
          resolvedUserId = String(node.user.pk || node.user.id);
          if (resolvedUserId && resolvedUserId !== "[object Object]") break;
        }
        if (typeof node?.id === "string" && node.id.includes("_")) {
          const candidate = node.id.split("_")[1];
          if (candidate && candidate !== "[object Object]") {
            resolvedUserId = candidate;
            break;
          }
        }
      }
      return {
        edges: connection.edges,
        hasNextPage: Boolean(connection.page_info?.has_next_page),
        nextCursor: connection.page_info?.end_cursor,
        userId: resolvedUserId
      };
    }
    if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
      const errMsg = res.errors.map((e) => e.message || JSON.stringify(e)).join("; ");
      throw new Error(`Instagram GraphQL query error: ${errMsg}`);
    }
    return { edges: [], hasNextPage: false };
  }
  async fetchNextPostsPage(userId, username, cursor, options, tokens) {
    try {
      const page = await this.fetchPostsTabGraphQL(username, cursor, tokens || {}, options);
      if (page.edges && page.edges.length > 0) {
        return page;
      }
    } catch (err) {
      logExtractorDebug("PolarisProfilePostsTabContentQuery_connection", err);
    }
    if (userId) {
      const variables = JSON.stringify({ id: userId, first: 12, after: cursor });
      const url = `https://www.instagram.com/graphql/query/?query_hash=${IG_TIMELINE_QUERY_HASH}&variables=${encodeURIComponent(variables)}`;
      try {
        const headers = {
          "X-IG-App-ID": IG_APP_ID,
          "Referer": `https://www.instagram.com/${username}/`
        };
        if (tokens?.csrfToken) headers["X-CSRFToken"] = tokens.csrfToken;
        const res = await this.httpClient.fetchJson(url, {
          cookiePath: options.cookiePath,
          cookieDomain: "instagram.com",
          signal: options.signal,
          headers
        });
        const data = res?.data?.user?.edge_owner_to_timeline_media;
        if (data?.edges && data.edges.length > 0) {
          return {
            edges: data.edges,
            hasNextPage: Boolean(data.page_info?.has_next_page),
            nextCursor: data.page_info?.end_cursor
          };
        }
      } catch (err) {
        logExtractorDebug("edge_owner_to_timeline_media", err);
      }
    }
    if (userId) {
      try {
        const restUrl = `https://www.instagram.com/api/v1/feed/user/${userId}/?count=12&max_id=${encodeURIComponent(cursor)}`;
        const headers = {
          "X-IG-App-ID": IG_APP_ID,
          "Referer": `https://www.instagram.com/${username}/`
        };
        if (tokens?.csrfToken) headers["X-CSRFToken"] = tokens.csrfToken;
        const res = await this.httpClient.fetchJson(restUrl, {
          cookiePath: options.cookiePath,
          cookieDomain: "instagram.com",
          signal: options.signal,
          headers
        });
        if (Array.isArray(res?.items) && res.items.length > 0) {
          const edges = res.items.map((item) => ({ node: item }));
          return {
            edges,
            hasNextPage: Boolean(res.more_available),
            nextCursor: res.next_max_id ? String(res.next_max_id) : void 0
          };
        }
      } catch (err) {
        logExtractorDebug("v1 user feed REST", err);
      }
    }
    return { edges: [], hasNextPage: false };
  }
  async fetchNextReelsPage(userId, cursor, options) {
    try {
      const variables = JSON.stringify({
        after: cursor,
        first: 12,
        id: userId,
        data: {
          include_feed_video: true,
          page_size: 12,
          target_user_id: userId
        }
      });
      const postUrl = "https://www.instagram.com/graphql/query";
      const body = new URLSearchParams({
        doc_id: IG_QUERIES.PolarisProfileReelsTabContentQuery_connection,
        variables
      }).toString();
      const res = await this.httpClient.fetchJson(postUrl, {
        method: "POST",
        body,
        cookiePath: options.cookiePath,
        cookieDomain: "instagram.com",
        signal: options.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-IG-App-ID": IG_APP_ID,
          "X-FB-Friendly-Name": "PolarisProfileReelsTabContentQuery_connection",
          "Referer": "https://www.instagram.com/"
        }
      });
      const reelsData = res?.data?.fetch__XDTUserDict;
      let connection = reelsData?.reels;
      if (!connection && reelsData) {
        for (const val of Object.values(reelsData)) {
          if (val && typeof val === "object" && "edges" in val) {
            connection = val;
            break;
          }
        }
      }
      if (connection?.edges && Array.isArray(connection.edges) && connection.edges.length > 0) {
        if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
          logExtractorDebug("PolarisProfileReelsTabContentQuery partial field errors", res.errors);
        }
        return {
          edges: connection.edges,
          hasNextPage: Boolean(connection.page_info?.has_next_page),
          nextCursor: connection.page_info?.end_cursor
        };
      }
      if (res?.errors && Array.isArray(res.errors) && res.errors.length > 0) {
        const errMsg = res.errors.map((e) => e.message || JSON.stringify(e)).join("; ");
        throw new Error(`Instagram GraphQL query error: ${errMsg}`);
      }
    } catch (err) {
      logExtractorDebug("PolarisProfileReelsTabContentQuery_connection", err);
    }
    return { edges: [], hasNextPage: false };
  }
  async *extract(profile, options) {
    const username = profile.username;
    const subDir = options.subDir;
    options.onProgress?.({
      stage: "Profile",
      found: 0,
      message: `Fetching Instagram profile @${username}...`
    });
    let user = null;
    try {
      user = await this.fetchUserProfile(username, options);
    } catch (err) {
      logExtractorDebug("fetchUserProfile", err);
    }
    let webTokens = {};
    try {
      webTokens = await this.fetchWebTokens(username, options);
    } catch (err) {
      logExtractorDebug("fetchWebTokens", err);
    }
    let userId = user?.id || webTokens.userId;
    if ((!userId || userId === "[object Object]") && (subDir === "Stories" || subDir === "Highlights")) {
      try {
        const probe = await this.fetchPostsTabGraphQL(username, void 0, webTokens, options);
        if (probe.userId && probe.userId !== "[object Object]") {
          userId = probe.userId;
        }
      } catch (err) {
        logExtractorDebug("userId probe", err);
      }
    }
    if (subDir === "Stories") {
      if (!userId || userId === "[object Object]") {
        throw new Error(`Could not resolve user ID for @${username}. Profile may be private or unavailable.`);
      }
      options.onProgress?.({
        stage: "Stories",
        found: 0,
        message: `Fetching stories for @${username}...`
      });
      const reels = await this.fetchReelsMedia([userId], options, webTokens);
      let count = 0;
      for (const reel of reels) {
        for (const rawItem of reel.items || []) {
          const item = parseReelItemToMediaItem(rawItem, username);
          if (item) {
            count++;
            yield item;
          }
        }
      }
      if (count === 0) {
        options.onProgress?.({
          stage: "Stories",
          found: 0,
          message: `Profile @${username} has no active stories in the last 24 hours.`
        });
      }
      return;
    }
    if (subDir === "Highlights") {
      if (!userId || userId === "[object Object]") {
        throw new Error(`Could not resolve user ID for @${username}. Profile may be private or unavailable.`);
      }
      options.onProgress?.({
        stage: "Highlights",
        found: 0,
        message: `Fetching highlights tray for @${username}...`
      });
      const tray = await this.fetchHighlightsTray(userId, options, webTokens);
      const highlightIds = tray.map((t) => t.id).filter(Boolean);
      if (highlightIds.length === 0) {
        options.onProgress?.({
          stage: "Highlights",
          found: 0,
          message: `Profile @${username} has no available highlights.`
        });
        return;
      }
      const chunkSize = 5;
      for (let i = 0; i < highlightIds.length; i += chunkSize) {
        if (options.signal?.aborted) break;
        const chunk = highlightIds.slice(i, i + chunkSize);
        const reels = await this.fetchReelsMedia(chunk, options, webTokens);
        for (const reel of reels) {
          for (const rawItem of reel.items || []) {
            const item = parseReelItemToMediaItem(rawItem, username);
            if (item) yield item;
          }
        }
        await sleep(1e3, 1500, options.signal);
      }
      return;
    }
    let found = 0;
    const emittedItemIds = /* @__PURE__ */ new Set();
    let currentEdges = user?.edge_owner_to_timeline_media?.edges ?? [];
    let hasNextPage = Boolean(user?.edge_owner_to_timeline_media?.page_info?.has_next_page);
    let endCursor = user?.edge_owner_to_timeline_media?.page_info?.end_cursor;
    if (options.initialCursor) {
      endCursor = options.initialCursor;
      hasNextPage = true;
      currentEdges = [];
      try {
        const resumedPage = await this.fetchNextPostsPage(userId || "", username, endCursor, options, webTokens);
        currentEdges = resumedPage.edges;
        hasNextPage = resumedPage.hasNextPage;
        endCursor = resumedPage.nextCursor;
      } catch (err) {
        logExtractorDebug("fetchNextPostsPage resume", err);
      }
    } else if (!user) {
      try {
        const firstPage = await this.fetchPostsTabGraphQL(username, void 0, webTokens, options);
        currentEdges = firstPage.edges;
        hasNextPage = firstPage.hasNextPage;
        endCursor = firstPage.nextCursor;
        if (!userId && firstPage.userId) {
          userId = firstPage.userId;
        }
      } catch (err) {
        logExtractorDebug("fetchPostsTabGraphQL initial", err);
      }
    }
    while (true) {
      let reachedSinceLimit = false;
      for (const edge of currentEdges) {
        const items = parseIgNodeToMediaItems(edge.node, username);
        for (const item of items) {
          if (subDir === "Photos" && item.type !== "photo") continue;
          if (subDir === "Videos" && item.type !== "video") continue;
          if (options.until !== void 0 && item.date && item.date > options.until) continue;
          if (options.since !== void 0 && item.date && item.date < options.since) {
            reachedSinceLimit = true;
            break;
          }
          if (emittedItemIds.has(item.id)) continue;
          emittedItemIds.add(item.id);
          found++;
          options.onProgress?.({
            stage: subDir,
            found,
            message: `Found item: ${item.filename}`
          });
          yield item;
          if (options.limit !== void 0 && found >= options.limit) return;
        }
        if (reachedSinceLimit) break;
      }
      if (reachedSinceLimit) break;
      if (!hasNextPage || !endCursor || options.signal?.aborted) {
        break;
      }
      await sleep(1500, 2500, options.signal);
      try {
        const nextPage = await this.fetchNextPostsPage(userId || "", username, endCursor, options, webTokens);
        currentEdges = nextPage.edges;
        hasNextPage = nextPage.hasNextPage;
        endCursor = nextPage.nextCursor;
        if (endCursor) {
          options.onCheckpoint?.("timeline", endCursor);
        }
        if (currentEdges.length === 0) {
          break;
        }
      } catch {
        break;
      }
    }
    if ((subDir === "Videos" || subDir === "All") && userId) {
      const videoEdges = user?.edge_felix_video_timeline?.edges ?? [];
      for (const edge of videoEdges) {
        const items = parseIgNodeToMediaItems(edge.node, username);
        for (const item of items) {
          if (item.type !== "video") continue;
          if (emittedItemIds.has(item.id)) continue;
          emittedItemIds.add(item.id);
          found++;
          options.onProgress?.({
            stage: "Videos",
            found,
            message: `Found reel: ${item.filename}`
          });
          yield item;
        }
      }
      let reelsCursor = "";
      let hasMoreReels = true;
      while (hasMoreReels && !options.signal?.aborted) {
        try {
          const reelsPage = await this.fetchNextReelsPage(userId, reelsCursor, options);
          if (!reelsPage.edges || reelsPage.edges.length === 0) break;
          for (const edge of reelsPage.edges) {
            const items = parseIgNodeToMediaItems(edge.node, username);
            for (const item of items) {
              if (item.type !== "video") continue;
              if (emittedItemIds.has(item.id)) continue;
              emittedItemIds.add(item.id);
              found++;
              options.onProgress?.({
                stage: "Videos",
                found,
                message: `Found reel: ${item.filename}`
              });
              yield item;
            }
          }
          if (reelsPage.hasNextPage && reelsPage.nextCursor && reelsPage.nextCursor !== reelsCursor) {
            reelsCursor = reelsPage.nextCursor;
            await sleep(1500, 2500, options.signal);
          } else {
            hasMoreReels = false;
          }
        } catch {
          break;
        }
      }
    }
  }
};

// src/lib/engines/extractors/x.ts
var TWITTER_BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
var TWITTER_FEATURES = {
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  tweetypie_unmention_optimization_enabled: true,
  vibe_api_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  interactive_text_enabled: true,
  responsive_web_text_conversations_enabled: false,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_analysis_button_from_backend: true,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  rweb_tipjar_consumption_enabled: true
};
function shouldSkipTweetReply(tweet, targetUserId, mode = "timeline") {
  const tweetResult = tweet.tweet || tweet;
  const legacy = tweetResult.legacy || tweetResult;
  const replyToUserId = legacy.in_reply_to_user_id_str;
  if (!replyToUserId) {
    return false;
  }
  const authorId = legacy.user_id_str || tweetResult.core?.user_results?.result?.rest_id;
  if (mode === "timeline") {
    if (targetUserId) {
      if (replyToUserId !== targetUserId || authorId && authorId !== targetUserId) {
        return true;
      }
      return false;
    }
    return Boolean(authorId && replyToUserId !== authorId);
  }
  if (authorId && replyToUserId === authorId) {
    return false;
  }
  return true;
}
function parseTweetMediaEntities(tweet, username) {
  const items = [];
  const tweetResult = tweet.tweet || tweet;
  const legacy = tweetResult.legacy || tweetResult;
  const entities = legacy.extended_entities?.media || legacy.entities?.media || [];
  const tweetId = tweetResult.rest_id || legacy.id_str || String(Date.now());
  const rawDate = legacy.created_at ? new Date(legacy.created_at).getTime() / 1e3 : void 0;
  const caption = legacy.full_text || legacy.text;
  for (let idx = 0; idx < entities.length; idx++) {
    const media = entities[idx];
    const subIndex = idx + 1;
    const baseFilename = `${username}_${rawDate ? `${rawDate}_` : ""}${tweetId}_${subIndex}`;
    if (media.type === "video" || media.type === "animated_gif") {
      const variants = (media.video_info?.variants || []).filter((v) => v.content_type === "video/mp4").sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
      const bestVariant = variants[0];
      if (bestVariant?.url) {
        items.push({
          id: `${tweetId}_${media.id_str}`,
          url: bestVariant.url,
          filename: baseFilename,
          extension: "mp4",
          type: "video",
          caption,
          author: username,
          platform: "x",
          date: rawDate,
          thumbnailUrl: media.media_url_https,
          ...entities.length > 1 ? {
            carouselId: tweetId,
            carouselIndex: subIndex,
            carouselTotal: entities.length
          } : {}
        });
      }
    } else {
      let photoUrl = media.media_url_https;
      if (photoUrl) {
        const cleanUrl = photoUrl.replace(/:[a-zA-Z]+$/, "");
        const urlWithOrig = cleanUrl.includes("?") ? `${cleanUrl}&name=orig` : `${cleanUrl}?name=orig`;
        const extMatch = photoUrl.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
        const ext = extMatch ? extMatch[1] : "jpg";
        items.push({
          id: `${tweetId}_${media.id_str}`,
          url: urlWithOrig,
          filename: baseFilename,
          extension: ext,
          type: "photo",
          caption,
          author: username,
          platform: "x",
          date: rawDate,
          width: media.original_info?.width,
          height: media.original_info?.height,
          ...entities.length > 1 ? {
            carouselId: tweetId,
            carouselIndex: subIndex,
            carouselTotal: entities.length
          } : {}
        });
      }
    }
  }
  return items;
}
var XExtractor = class {
  platform = "x";
  httpClient;
  guestToken;
  constructor(httpClient) {
    this.httpClient = httpClient ?? new HttpClient({
      "Authorization": `Bearer ${TWITTER_BEARER_TOKEN}`,
      "Referer": "https://x.com/",
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en"
    });
  }
  async ensureGuestToken(options) {
    if (this.guestToken) return this.guestToken;
    try {
      const res = await this.httpClient.fetchJson(
        "https://api.twitter.com/1.1/guest/activate.json",
        {
          method: "POST",
          cookiePath: options.cookiePath,
          cookieDomain: "x.com",
          signal: options.signal,
          retries: 0,
          timeoutMs: 3e3,
          headers: {
            "Authorization": `Bearer ${TWITTER_BEARER_TOKEN}`
          }
        }
      );
      if (res.guest_token) {
        this.guestToken = res.guest_token;
        this.httpClient.setHeader("x-guest-token", res.guest_token);
        return res.guest_token;
      }
    } catch (err) {
      if (options.signal?.aborted) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to activate X/Twitter guest session: ${msg}`);
    }
    throw new Error("Failed to activate X/Twitter guest session: no guest token returned");
  }
  async fetchUserRestId(username, options) {
    if (username.startsWith("id:")) {
      return username.slice(3);
    }
    if (username === "i_history_likes") {
      if (options.cookiePath) {
        let cookies = await loadCookiesFromPath(options.cookiePath, "x.com");
        if (!cookies["twid"]) {
          cookies = await loadCookiesFromPath(options.cookiePath, "twitter.com");
        }
        if (!cookies["twid"]) {
          cookies = await loadCookiesFromPath(options.cookiePath);
        }
        const twid = cookies["twid"];
        if (twid) {
          const decoded = decodeURIComponent(twid).replace(/^"|"$/g, "").trim();
          const rawId = decoded.startsWith("u=") ? decoded.slice(2) : decoded.includes("=") ? decoded.split("=").pop()?.trim() : decoded;
          if (rawId && /^[a-zA-Z0-9_-]+$/.test(rawId)) {
            return rawId;
          }
        }
      }
      throw new Error("Authentication required for X/Twitter likes history: missing 'twid' cookie");
    }
    await this.ensureGuestToken(options);
    const variables = JSON.stringify({
      screen_name: username,
      withSafetyModeUserFields: true
    });
    const features = JSON.stringify(TWITTER_FEATURES);
    const url = `https://x.com/i/api/graphql/ck5KkZ8t5cOmoLssopN99Q/UserByScreenName?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`;
    try {
      const res = await this.httpClient.fetchJson(url, {
        cookiePath: options.cookiePath,
        cookieDomain: "x.com",
        signal: options.signal,
        retries: 0,
        timeoutMs: 4e3
      });
      const restId = res.data?.user?.result?.rest_id;
      if (restId) return restId;
    } catch {
    }
    const syndiUrl = `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${encodeURIComponent(username)}`;
    try {
      const res = await this.httpClient.fetchJson(syndiUrl, {
        signal: options.signal,
        retries: 0,
        timeoutMs: 3e3
      });
      if (res[0]?.id) return String(res[0].id);
    } catch {
    }
    throw new Error(`Failed to resolve X/Twitter user ID for @${username}`);
  }
  async *extract(profile, options) {
    const username = profile.username;
    const subDir = options.subDir;
    const isLikes = username === "i_history_likes" || profile.cleanUrl?.endsWith("/likes");
    const authHeaders = {};
    if (options.cookiePath) {
      let cookies = await loadCookiesFromPath(options.cookiePath, "x.com");
      if (!cookies["ct0"] && !cookies["auth_token"]) {
        const twCookies = await loadCookiesFromPath(options.cookiePath, "twitter.com");
        cookies = { ...twCookies, ...cookies };
      }
      if (cookies["ct0"]) {
        authHeaders["x-csrf-token"] = cookies["ct0"];
      }
      if (cookies["auth_token"]) {
        authHeaders["x-twitter-auth-type"] = "OAuth2Session";
      }
    }
    options.onProgress?.({
      stage: isLikes ? "Likes" : "Profile",
      found: 0,
      message: isLikes ? "Fetching liked posts from X..." : `Fetching X profile @${username}...`
    });
    const userId = await this.fetchUserRestId(username, options);
    const endpoint = isLikes ? "https://x.com/i/api/graphql/TGEKkJG_meudeaFcqaxM-Q/Likes" : "https://x.com/i/api/graphql/jCRhbOzdgOHp6u9H4g2tEg/UserMedia";
    let cursor = options.initialCursor;
    let hasMore = true;
    let found = 0;
    while (hasMore) {
      if (options.signal?.aborted) break;
      const variables = {
        userId,
        count: 50,
        includePromotedContent: false,
        withClientEventToken: false,
        withBirdwatchNotes: false,
        withVoice: true
      };
      if (cursor) {
        variables.cursor = cursor;
      }
      const features = JSON.stringify(TWITTER_FEATURES);
      const url = `${endpoint}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(features)}`;
      let res;
      try {
        res = await this.httpClient.fetchJson(url, {
          cookiePath: options.cookiePath,
          cookieDomain: "x.com",
          signal: options.signal,
          headers: authHeaders
        });
      } catch (err) {
        break;
      }
      if (res?.errors?.length && !res?.data?.user?.result) {
        throw new Error(`X/Twitter API error: ${res.errors[0]?.message || "GraphQL query failed"}`);
      }
      const instructions = res?.data?.user?.result?.timeline_v2?.timeline?.instructions || [];
      let newCursor;
      let pageItemCount = 0;
      for (const inst of instructions) {
        const entries = inst.entries || (inst.entry ? [inst.entry] : []);
        for (const entry of entries) {
          if (entry.entryId?.startsWith("cursor-bottom-")) {
            newCursor = entry.content?.value;
            continue;
          }
          const tweetContent = entry.content?.itemContent?.tweet_results?.result;
          if (tweetContent) {
            if (shouldSkipTweetReply(tweetContent, userId, isLikes ? "likes" : "timeline")) {
              continue;
            }
            let reachedSinceLimit = false;
            const mediaItems = parseTweetMediaEntities(tweetContent, username);
            for (const item of mediaItems) {
              if (subDir === "Photos" && item.type !== "photo") continue;
              if (subDir === "Videos" && item.type !== "video") continue;
              if (options.until !== void 0 && item.date && item.date > options.until) continue;
              if (options.since !== void 0 && item.date && item.date < options.since) {
                reachedSinceLimit = true;
                break;
              }
              found++;
              pageItemCount++;
              options.onProgress?.({
                stage: subDir,
                found,
                message: `Found item: ${item.filename}`
              });
              yield item;
              if (options.limit !== void 0 && found >= options.limit) return;
            }
            if (reachedSinceLimit) {
              hasMore = false;
              break;
            }
          }
        }
      }
      if (!newCursor || newCursor === cursor || pageItemCount === 0) {
        hasMore = false;
        options.onCheckpoint?.("timeline", "");
      } else {
        cursor = newCursor;
        options.onCheckpoint?.("timeline", cursor);
        await sleep(1500, 2500, options.signal);
      }
    }
  }
};

// src/lib/engines/extractors/tiktok.ts
function parseTikTokRehydrationJson(html) {
  const universalMatch = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (universalMatch) {
    try {
      const raw = JSON.parse(universalMatch[1]);
      const scope = raw?.["__DEFAULT_SCOPE__"] || raw;
      if (scope) return scope;
    } catch {
    }
  }
  const sigiTagMatch = html.match(
    /<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/
  );
  if (sigiTagMatch) {
    try {
      const raw = JSON.parse(sigiTagMatch[1]);
      const user = Object.values(raw?.UserModule?.users || {})[0];
      const items = Object.values(raw?.ItemModule || {});
      return {
        "webapp.user-detail": {
          userInfo: { user },
          itemList: items
        },
        SIGI_STATE: raw
      };
    } catch {
    }
  }
  const sigiWindowMatch = html.match(
    /(?:window\[['"]SIGI_STATE['"]\]|SIGI_STATE)\s*=\s*(\{[\s\S]*?\})\s*;/i
  );
  if (sigiWindowMatch) {
    try {
      const raw = JSON.parse(sigiWindowMatch[1]);
      const user = Object.values(raw?.UserModule?.users || {})[0];
      const items = Object.values(raw?.ItemModule || {});
      return {
        "webapp.user-detail": {
          userInfo: { user },
          itemList: items
        },
        SIGI_STATE: raw
      };
    } catch {
    }
  }
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (nextDataMatch) {
    try {
      const raw = JSON.parse(nextDataMatch[1]);
      const pageProps = raw?.props?.pageProps;
      if (pageProps) {
        return {
          "webapp.user-detail": {
            userInfo: pageProps.userInfo,
            itemList: pageProps.items || pageProps.itemList || []
          },
          __NEXT_DATA__: raw
        };
      }
    } catch {
    }
  }
  const secUidMatch = html.match(/(?:secUid|sec_uid)["':=\s]+(MS4wLjABAAAA[\w-]{32,64})/i);
  if (secUidMatch) {
    return {
      "webapp.user-detail": {
        userInfo: {
          user: {
            secUid: secUidMatch[1]
          }
        },
        itemList: []
      }
    };
  }
  return null;
}
function parseTikTokItem(item, username) {
  const items = [];
  const id = item.id || item.itemId || String(Date.now());
  const date = Number(item.createTime) || void 0;
  const caption = item.desc;
  const imageList = item.imagePost?.images;
  if (Array.isArray(imageList) && imageList.length > 0) {
    imageList.forEach((img, idx) => {
      const imgUrl = img.imageURL?.urlList?.[0] || img.displayImage?.urlList?.[0];
      if (imgUrl) {
        items.push({
          id: `${id}_${idx + 1}`,
          url: imgUrl,
          filename: `${username}_${date ? `${date}_` : ""}${id}_${idx + 1}`,
          extension: "jpg",
          type: "photo",
          caption,
          date,
          author: username,
          platform: "tiktok",
          carouselId: id,
          carouselIndex: idx + 1,
          carouselTotal: imageList.length
        });
      }
    });
    return items;
  }
  const video = item.video;
  const videoUrl = video?.playAddr || video?.downloadAddr;
  if (videoUrl) {
    items.push({
      id,
      url: videoUrl,
      filename: `${username}_${date ? `${date}_` : ""}${id}`,
      extension: "mp4",
      type: "video",
      caption,
      date,
      width: video?.width,
      height: video?.height,
      thumbnailUrl: video?.cover || video?.originCover,
      author: username,
      platform: "tiktok"
    });
  }
  return items;
}
var TikTokExtractor = class {
  platform = "tiktok";
  httpClient;
  constructor(httpClient) {
    this.httpClient = httpClient ?? new HttpClient({
      "Referer": "https://www.tiktok.com/"
    });
  }
  async *extract(profile, options) {
    const cleanUsername = profile.username.replace(/^@/, "");
    const subDir = options.subDir;
    options.onProgress?.({
      stage: "Profile",
      found: 0,
      message: `Fetching TikTok profile @${cleanUsername}...`
    });
    const profileUrl = `https://www.tiktok.com/@${cleanUsername}`;
    const html = await this.httpClient.fetchText(profileUrl, {
      cookiePath: options.cookiePath,
      cookieDomain: "tiktok.com",
      signal: options.signal,
      retries: 0,
      timeoutMs: 4e3
    });
    const scope = parseTikTokRehydrationJson(html);
    const userDetail = scope?.["webapp.user-detail"];
    const userInfo = userDetail?.userInfo?.user;
    const secUid = userInfo?.secUid;
    let found = 0;
    const initialItems = userDetail?.itemList || [];
    for (const rawItem of initialItems) {
      const mediaList = parseTikTokItem(rawItem, cleanUsername);
      for (const item of mediaList) {
        if (subDir === "Photos" && item.type !== "photo") continue;
        if (subDir === "Videos" && item.type !== "video") continue;
        found++;
        options.onProgress?.({
          stage: subDir,
          found,
          message: `Found item: ${item.filename}`
        });
        yield item;
      }
    }
    if (!secUid) {
      return;
    }
    let cursor = options.initialCursor || "0";
    let hasMore = true;
    const visitedCursors = /* @__PURE__ */ new Set();
    while (hasMore) {
      if (options.signal?.aborted) break;
      if (visitedCursors.has(cursor)) break;
      visitedCursors.add(cursor);
      const deviceId = `${Math.floor(725e16 + Math.random() * 75e15)}`;
      const queryParams = new URLSearchParams({
        aid: "1988",
        app_name: "tiktok_web",
        device_platform: "web_pc",
        channel: "tiktok_web",
        device_id: deviceId,
        secUid,
        count: "30",
        cursor,
        post_item_list_request_type: "0"
      });
      const apiUrl = `https://www.tiktok.com/api/post/item_list/?${queryParams.toString()}`;
      let res;
      try {
        res = await this.httpClient.fetchJson(apiUrl, {
          cookiePath: options.cookiePath,
          cookieDomain: "tiktok.com",
          signal: options.signal,
          headers: {
            "Referer": profileUrl
          }
        });
      } catch {
        break;
      }
      const items = res?.itemList || [];
      if (items.length === 0) break;
      let reachedSinceLimit = false;
      for (const rawItem of items) {
        const mediaList = parseTikTokItem(rawItem, cleanUsername);
        for (const item of mediaList) {
          if (subDir === "Photos" && item.type !== "photo") continue;
          if (subDir === "Videos" && item.type !== "video") continue;
          if (options.until !== void 0 && item.date && item.date > options.until) continue;
          if (options.since !== void 0 && item.date && item.date < options.since) {
            reachedSinceLimit = true;
            break;
          }
          found++;
          options.onProgress?.({
            stage: subDir,
            found,
            message: `Found item: ${item.filename}`
          });
          yield item;
          if (options.limit !== void 0 && found >= options.limit) return;
        }
        if (reachedSinceLimit) break;
      }
      if (reachedSinceLimit) break;
      hasMore = Boolean(res?.hasMore);
      cursor = String(res?.cursor ?? "0");
      if (hasMore && cursor && cursor !== "0") {
        options.onCheckpoint?.("timeline", cursor);
      } else {
        options.onCheckpoint?.("timeline", "");
      }
      await sleep(1e3, 2e3, options.signal);
    }
  }
};

// src/lib/engines/extractors/facebook.ts
function decodeEscapedUrl(raw) {
  const sanitized = raw.replace(/[\r\n\t]/g, "").trim();
  try {
    return JSON.parse(`"${sanitized.replace(/"/g, '\\"')}"`);
  } catch {
    return sanitized.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\(["\\\/bfnrt])/g, (_, ch) => {
      const escapes = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "	"
      };
      return escapes[ch] || ch;
    });
  }
}
function extractFacebookMediaFromHtml(html, username) {
  const items = [];
  const seenUrls = /* @__PURE__ */ new Set();
  const videoPatterns = [
    /"browser_native_hd_url":"([^"]+)"/g,
    /"browser_native_sd_url":"([^"]+)"/g,
    /"playable_url_quality_hd":"([^"]+)"/g,
    /"playable_url":"([^"]+)"/g,
    /<video[^>]+src=["'](https?:[^"']+)["']/gi
  ];
  let videoIndex = 1;
  for (const regex of videoPatterns) {
    let vMatch;
    while ((vMatch = regex.exec(html)) !== null) {
      const rawUrl = vMatch[1];
      const videoUrl = decodeEscapedUrl(rawUrl).replace(/&amp;/g, "&");
      if (videoUrl.startsWith("http") && !seenUrls.has(videoUrl)) {
        seenUrls.add(videoUrl);
        items.push({
          id: `fb_video_${videoIndex}`,
          url: videoUrl,
          filename: `${username}_video_${videoIndex}`,
          extension: "mp4",
          type: "video"
        });
        videoIndex++;
      }
    }
  }
  const photoRegex = /,"(?:image|viewer_image|full_size_image|display_image)":\{"uri":"([^"]+)"/g;
  let match;
  let photoIndex = 1;
  while ((match = photoRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const photoUrl = decodeEscapedUrl(rawUrl).replace(/&amp;/g, "&");
    if (!seenUrls.has(photoUrl)) {
      seenUrls.add(photoUrl);
      items.push({
        id: `fb_photo_${photoIndex}`,
        url: photoUrl,
        filename: `${username}_photo_${photoIndex}`,
        extension: "jpg",
        type: "photo"
      });
      photoIndex++;
    }
  }
  const mbasicImgRegex = /<img[^>]+src=["'](https:\/\/[^"'\s]*scontent[^"'\s]*\.(?:jpg|png|webp)[^"'\s]*)["']/gi;
  let mMatch;
  while ((mMatch = mbasicImgRegex.exec(html)) !== null) {
    const rawUrl = mMatch[1];
    const photoUrl = decodeEscapedUrl(rawUrl).replace(/&amp;/g, "&");
    if (!seenUrls.has(photoUrl)) {
      seenUrls.add(photoUrl);
      items.push({
        id: `fb_photo_${photoIndex}`,
        url: photoUrl,
        filename: `${username}_photo_${photoIndex}`,
        extension: "jpg",
        type: "photo"
      });
      photoIndex++;
    }
  }
  if (items.length === 0) {
    const scontentRegex = /https:\/\/[^"'\s<>]*scontent[^"'\s<>]*\.(?:jpg|png|webp)[^"'\s<>]*/gi;
    let sMatch;
    while ((sMatch = scontentRegex.exec(html)) !== null) {
      const cleanUrl = sMatch[0].replace(/\\/g, "").replace(/&amp;/g, "&");
      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        items.push({
          id: `fb_photo_${photoIndex}`,
          url: cleanUrl,
          filename: `${username}_photo_${photoIndex}`,
          extension: "jpg",
          type: "photo"
        });
        photoIndex++;
      }
    }
  }
  return items;
}
function extractFacebookPaginationCursor(html) {
  const jsonCursorMatch = html.match(/"end_cursor":"([^"]+)"/) || html.match(/"cursor":"([^"]+)"/);
  if (jsonCursorMatch && jsonCursorMatch[1]) {
    return jsonCursorMatch[1];
  }
  const linkCursorMatch = html.match(/[?&](?:cursor|after)=([^"'\s&<>]+)/i);
  if (linkCursorMatch && linkCursorMatch[1]) {
    try {
      return decodeURIComponent(linkCursorMatch[1]);
    } catch {
      return linkCursorMatch[1];
    }
  }
  return null;
}
function resolveFacebookUrl(href, currentUrl) {
  const cleanHref = href.replace(/\\/g, "").replace(/&amp;/g, "&");
  try {
    return new URL(cleanHref, currentUrl).toString();
  } catch {
    return cleanHref;
  }
}
function extractFacebookNextPageUrl(html, currentUrl) {
  const moreItemMatch = html.match(/<div[^>]*id=["'](?:m_more_item|m_more_posts)["'][^>]*>\s*<a[^>]+href=["']([^"']+)["']/i);
  if (moreItemMatch && moreItemMatch[1]) {
    return resolveFacebookUrl(moreItemMatch[1], currentUrl);
  }
  const cursorLabelMatch = html.match(/<a[^>]+href=["']([^"']*(?:cursor=|after=)[^"']+)["'][^>]*>[\s\S]*?(?:See [Mm]ore|More [Pp]hotos|More|Next|Older [Pp]osts)[\s\S]*?<\/a>/i);
  if (cursorLabelMatch && cursorLabelMatch[1]) {
    return resolveFacebookUrl(cursorLabelMatch[1], currentUrl);
  }
  const genericCursorMatch = html.match(/<a[^>]+href=["']([^"']*(?:[?&]|&amp;)(?:cursor|after)=[^"']+)["']/i);
  if (genericCursorMatch && genericCursorMatch[1]) {
    return resolveFacebookUrl(genericCursorMatch[1], currentUrl);
  }
  const cursor = extractFacebookPaginationCursor(html);
  if (cursor) {
    try {
      const u = new URL(currentUrl);
      if (u.searchParams.get("cursor") !== cursor) {
        u.searchParams.set("cursor", cursor);
        return u.toString();
      }
    } catch {
      if (!currentUrl.includes(cursor)) {
        const sep = currentUrl.includes("?") ? "&" : "?";
        return `${currentUrl}${sep}cursor=${encodeURIComponent(cursor)}`;
      }
    }
  }
  return null;
}
var FacebookExtractor = class {
  platform = "facebook";
  httpClient;
  constructor(httpClient) {
    this.httpClient = httpClient ?? new HttpClient({
      "Referer": "https://www.facebook.com/"
    });
  }
  async *extract(profile, options) {
    const username = profile.username;
    const subDir = options.subDir;
    options.onProgress?.({
      stage: "Profile",
      found: 0,
      message: `Fetching Facebook profile @${username}...`
    });
    const pathsToScrape = subDir === "All" ? ["photos", "videos"] : [subDir === "Photos" ? "photos" : "videos"];
    const seenUrls = /* @__PURE__ */ new Set();
    let found = 0;
    for (const targetPath of pathsToScrape) {
      if (options.signal?.aborted) break;
      const desktopUrl = `https://www.facebook.com/${encodeURIComponent(username)}/${targetPath}`;
      const mbasicUrl = `https://mbasic.facebook.com/${encodeURIComponent(username)}/${targetPath}`;
      const mobileUrl = `https://m.facebook.com/${encodeURIComponent(username)}/${targetPath}`;
      let currentUrl = desktopUrl;
      let html = "";
      try {
        html = await this.httpClient.fetchText(desktopUrl, {
          cookiePath: options.cookiePath,
          cookieDomain: "facebook.com",
          signal: options.signal,
          retries: 0,
          timeoutMs: 4e3
        });
      } catch {
        html = "";
      }
      let initialItems = extractFacebookMediaFromHtml(html, username);
      if (initialItems.length === 0) {
        options.onProgress?.({
          stage: "Profile",
          found,
          message: `Desktop yielded 0 items. Falling back to mbasic.facebook.com for @${username}/${targetPath}...`
        });
        try {
          const mbasicHtml = await this.httpClient.fetchText(mbasicUrl, {
            cookiePath: options.cookiePath,
            cookieDomain: "facebook.com",
            signal: options.signal,
            retries: 1,
            timeoutMs: 5e3,
            headers: {
              "Referer": "https://mbasic.facebook.com/"
            }
          });
          const mbasicItems = extractFacebookMediaFromHtml(mbasicHtml, username);
          if (mbasicItems.length > 0 || mbasicHtml.length > 200) {
            html = mbasicHtml;
            currentUrl = mbasicUrl;
            initialItems = mbasicItems;
          }
        } catch {
        }
        if (initialItems.length === 0) {
          try {
            const mobileHtml = await this.httpClient.fetchText(mobileUrl, {
              cookiePath: options.cookiePath,
              cookieDomain: "facebook.com",
              signal: options.signal,
              retries: 0,
              timeoutMs: 5e3,
              headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Referer": "https://m.facebook.com/"
              }
            });
            const mobileItems = extractFacebookMediaFromHtml(mobileHtml, username);
            if (mobileItems.length > 0) {
              html = mobileHtml;
              currentUrl = mobileUrl;
              initialItems = mobileItems;
            }
          } catch {
          }
        }
      }
      let page = 1;
      const maxPages = 5;
      while (true) {
        const items = extractFacebookMediaFromHtml(html, username);
        let pageNewCount = 0;
        for (const item of items) {
          if (subDir === "Photos" && item.type !== "photo") continue;
          if (subDir === "Videos" && item.type !== "video") continue;
          if (seenUrls.has(item.url)) continue;
          seenUrls.add(item.url);
          found++;
          pageNewCount++;
          options.onProgress?.({
            stage: subDir === "All" ? targetPath === "photos" ? "Photos" : "Videos" : subDir,
            found,
            message: `Found item: ${item.filename}`
          });
          yield item;
        }
        if (page >= maxPages || options.signal?.aborted) {
          break;
        }
        const nextUrl = extractFacebookNextPageUrl(html, currentUrl);
        if (!nextUrl || nextUrl === currentUrl) {
          break;
        }
        if (pageNewCount === 0 && page > 1) {
          break;
        }
        await sleep(1e3, 2e3, options.signal);
        try {
          currentUrl = nextUrl;
          html = await this.httpClient.fetchText(currentUrl, {
            cookiePath: options.cookiePath,
            cookieDomain: "facebook.com",
            signal: options.signal,
            retries: 1,
            timeoutMs: 5e3,
            headers: {
              "Referer": currentUrl.includes("mbasic") ? "https://mbasic.facebook.com/" : "https://www.facebook.com/"
            }
          });
          page++;
        } catch {
          break;
        }
      }
    }
  }
};

// src/lib/engines/core/plugin.ts
var ExtractorPluginRegistry = class {
  plugins = /* @__PURE__ */ new Map();
  register(plugin) {
    this.plugins.set(plugin.platform, plugin);
  }
  get(platform) {
    return this.plugins.get(platform);
  }
  has(platform) {
    return this.plugins.has(platform);
  }
  list() {
    return Array.from(this.plugins.values());
  }
  findByUrl(url) {
    return this.list().find((plugin) => plugin.canHandle(url));
  }
  clear() {
    this.plugins.clear();
  }
};
var defaultPluginRegistry = new ExtractorPluginRegistry();

// src/lib/engines/extractors/index.ts
function getExtractor(platform) {
  switch (platform) {
    case "instagram":
      return new InstagramExtractor();
    case "x":
      return new XExtractor();
    case "tiktok":
      return new TikTokExtractor();
    case "facebook":
      return new FacebookExtractor();
    default:
      throw new Error(`Unsupported extractor platform: ${platform}`);
  }
}

// src/lib/engines/downloader.ts
import fs5 from "fs";
import fsPromises4 from "fs/promises";
import path5 from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

// src/lib/engines/metadata.ts
import fsPromises3 from "fs/promises";
function extractHashtags(caption) {
  if (!caption) return [];
  const matches = caption.match(/#([\p{L}\p{N}_]+)/gu);
  if (!matches) return [];
  const tags = matches.map((m) => m.replace(/^#/, ""));
  return Array.from(new Set(tags));
}
function buildMetadataSidecar(item, finalFilename, fallbackPlatform, fallbackAuthor) {
  const hashtags = extractHashtags(item.caption);
  const cleanExt = item.extension.replace(/^\./, "") || (item.type === "video" ? "mp4" : "jpg");
  const isoDate = item.date ? new Date(item.date * 1e3).toISOString() : void 0;
  let carousel;
  if (item.carouselId && item.carouselIndex !== void 0 && item.carouselTotal !== void 0) {
    carousel = {
      id: item.carouselId,
      index: item.carouselIndex,
      total: item.carouselTotal
    };
  }
  return {
    id: item.id,
    platform: item.platform || fallbackPlatform,
    author: item.author || fallbackAuthor,
    url: item.url,
    filename: finalFilename,
    type: item.type,
    extension: cleanExt,
    ...item.caption ? { caption: item.caption } : {},
    ...item.date ? { date: item.date, isoDate } : {},
    ...item.width ? { width: item.width } : {},
    ...item.height ? { height: item.height } : {},
    ...item.thumbnailUrl ? { thumbnailUrl: item.thumbnailUrl } : {},
    hashtags,
    ...carousel ? { carousel } : {},
    ...item.metadata ? { metadata: item.metadata } : {},
    extractedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function writeMetadataSidecar(sidecarPath, sidecar, date) {
  const tmpPath = `${sidecarPath}.tmp`;
  const jsonContent = JSON.stringify(sidecar, null, 2);
  await fsPromises3.writeFile(tmpPath, jsonContent, "utf-8");
  await fsPromises3.rename(tmpPath, sidecarPath);
  if (date) {
    try {
      const mtime = new Date(date * 1e3);
      await fsPromises3.utimes(sidecarPath, mtime, mtime);
    } catch {
    }
  }
}

// src/lib/engines/downloader.ts
var ARCHIVE_FILENAME = ".open-nami-archive.json";
var YTDLP_ARCHIVE_FILENAME = "archive_yt-dlp.txt";
var TEXT_ARCHIVE_FILENAME = "archive.txt";
async function loadArchive(destDir) {
  const archive = /* @__PURE__ */ new Set();
  const jsonPath = path5.join(destDir, ARCHIVE_FILENAME);
  try {
    const raw = await fsPromises4.readFile(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (id) archive.add(String(id));
      }
    }
  } catch {
  }
  const ytdlpPath = path5.join(destDir, YTDLP_ARCHIVE_FILENAME);
  try {
    const raw = await fsPromises4.readFile(ytdlpPath, "utf-8");
    const lines = raw.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split(/\s+/);
      const id = parts[parts.length - 1];
      if (id) archive.add(id);
    }
  } catch {
  }
  const textPath = path5.join(destDir, TEXT_ARCHIVE_FILENAME);
  try {
    const raw = await fsPromises4.readFile(textPath, "utf-8");
    const lines = raw.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split(/\s+/);
      const id = parts[parts.length - 1];
      if (id) archive.add(id);
    }
  } catch {
  }
  return archive;
}
async function saveArchive(destDir, archive) {
  const archivePath = path5.join(destDir, ARCHIVE_FILENAME);
  const tmpPath = `${archivePath}.tmp`;
  try {
    await fsPromises4.writeFile(tmpPath, JSON.stringify([...archive]), "utf-8");
    await fsPromises4.rename(tmpPath, archivePath);
  } catch {
  }
  const textPaths = [
    path5.join(destDir, YTDLP_ARCHIVE_FILENAME),
    path5.join(destDir, TEXT_ARCHIVE_FILENAME)
  ];
  const content = [...archive].map((id) => `${id}
`).join("");
  for (const tPath of textPaths) {
    try {
      await fsPromises4.writeFile(tPath, content, "utf-8");
    } catch {
    }
  }
}
function sanitizeFilename(rawFilename, fallbackId, ext) {
  const cleanExt = ext.replace(/^\./, "");
  const baseOnly = path5.basename(rawFilename);
  let sanitizedBase = baseOnly.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/[. ]+$/, "").trim();
  if (!sanitizedBase || /^_+$/.test(sanitizedBase)) {
    sanitizedBase = `item_${fallbackId}`;
  }
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(sanitizedBase)) {
    sanitizedBase = `_${sanitizedBase}`;
  }
  return sanitizedBase.includes(".") ? sanitizedBase : `${sanitizedBase}.${cleanExt}`;
}
function isCdnUrl(rawUrl) {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname.endsWith(".cdninstagram.com") || hostname.endsWith(".fbcdn.net") || hostname.endsWith(".tiktokcdn.com") || hostname.endsWith(".akamaized.net") || hostname === "pbs.twimg.com" || hostname === "video.twimg.com";
  } catch {
    return false;
  }
}
async function downloadMediaStream(items, options) {
  const { jobName, destDir, signal, onProgress } = options;
  const httpClient = options.httpClient ?? new HttpClient();
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const dirArchives = /* @__PURE__ */ new Map();
  const getArchiveForDir = async (dir) => {
    let arch = dirArchives.get(dir);
    if (!arch) {
      await fsPromises4.mkdir(dir, { recursive: true });
      arch = await loadArchive(dir);
      dirArchives.set(dir, arch);
    }
    return arch;
  };
  if (options.destDirMap && Object.values(options.destDirMap).some(Boolean)) {
    for (const d of Object.values(options.destDirMap)) {
      if (d) await getArchiveForDir(d);
    }
  } else {
    await getArchiveForDir(destDir);
  }
  let downloaded = 0;
  let skipped = 0;
  const errors = [];
  const iterator = items[Symbol.asyncIterator]();
  let queueLock = Promise.resolve();
  let isDone = false;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;
  function getNextItem() {
    const nextItem = queueLock.then(() => iterator.next());
    queueLock = nextItem.then(
      () => {
      },
      () => {
      }
    );
    return nextItem;
  }
  async function downloadWorker() {
    while (!isDone && !signal?.aborted) {
      if (options.limit !== void 0 && downloaded >= options.limit) {
        isDone = true;
        break;
      }
      let item;
      try {
        const next = await getNextItem();
        if (next.done) {
          isDone = true;
          break;
        }
        consecutiveErrors = 0;
        item = next.value;
      } catch (err) {
        consecutiveErrors++;
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Extraction stream error: ${errMsg}`);
        const cleanErr = errMsg.includes("429") ? "rate limited by platform (HTTP 429)" : errMsg.length > 50 ? `${errMsg.slice(0, 47)}\u2026` : errMsg;
        onProgress?.({
          job: jobName,
          downloadedCount: downloaded,
          skippedCount: skipped,
          currentFile: "",
          statusText: `Extractor error: ${cleanErr}`
        });
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS || signal?.aborted) {
          isDone = true;
          break;
        }
        continue;
      }
      const targetDir = options.destDirMap?.[item.type] ?? destDir;
      const archive = await getArchiveForDir(targetDir);
      const ext = item.extension.replace(/^\./, "") || (item.type === "video" ? "mp4" : "jpg");
      const finalFilename = sanitizeFilename(item.filename, item.id, ext);
      const finalPath = path5.join(targetDir, finalFilename);
      const sidecarPath = path5.join(targetDir, `${path5.parse(finalFilename).name}.json`);
      if (archive.has(item.id) && fs5.existsSync(finalPath)) {
        if (options.writeMetadata && !fs5.existsSync(sidecarPath)) {
          try {
            const sidecar = buildMetadataSidecar(item, finalFilename, options.defaultPlatform, options.defaultAuthor);
            await writeMetadataSidecar(sidecarPath, sidecar, item.date);
          } catch {
          }
        }
        skipped++;
        onProgress?.({
          job: jobName,
          downloadedCount: downloaded,
          skippedCount: skipped,
          currentFile: finalFilename,
          statusText: `Skipping already downloaded: ${finalFilename}`
        });
        continue;
      }
      onProgress?.({
        job: jobName,
        downloadedCount: downloaded,
        skippedCount: skipped,
        currentFile: finalFilename,
        statusText: `Downloading: ${finalFilename}`
      });
      const tmpPath = `${finalPath}.download`;
      try {
        const reqHeaders = {};
        if (options.referer) {
          reqHeaders["Referer"] = options.referer;
        }
        const isCdn = isCdnUrl(item.url);
        const response = await httpClient.request(item.url, {
          signal,
          cookiePath: isCdn ? void 0 : options.cookiePath,
          headers: reqHeaders,
          retries: 2,
          retryDelayMs: 1500
        });
        if (!response.ok || !response.body) {
          try {
            await response.body?.cancel();
          } catch {
          }
          throw new Error(`HTTP ${response.status} (${response.statusText}) for ${item.url}`);
        }
        const fileStream = fs5.createWriteStream(tmpPath);
        await pipeline(Readable.fromWeb(response.body), fileStream, { signal });
        if (item.date) {
          try {
            const mtime = new Date(item.date * 1e3);
            await fsPromises4.utimes(tmpPath, mtime, mtime);
          } catch {
          }
        }
        await fsPromises4.rename(tmpPath, finalPath);
        if (options.writeMetadata) {
          try {
            const sidecar = buildMetadataSidecar(item, finalFilename, options.defaultPlatform, options.defaultAuthor);
            await writeMetadataSidecar(sidecarPath, sidecar, item.date);
          } catch {
          }
        }
        archive.add(item.id);
        downloaded++;
        consecutiveErrors = 0;
        if (options.limit !== void 0 && downloaded >= options.limit) {
          isDone = true;
        }
        onProgress?.({
          job: jobName,
          downloadedCount: downloaded,
          skippedCount: skipped,
          currentFile: finalFilename,
          statusText: `Saved: ${finalFilename}`
        });
      } catch (err) {
        try {
          if (fs5.existsSync(tmpPath)) {
            await fsPromises4.unlink(tmpPath);
          }
        } catch {
        }
        if (signal?.aborted) {
          break;
        }
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${finalFilename}: ${errMsg}`);
        onProgress?.({
          job: jobName,
          downloadedCount: downloaded,
          skippedCount: skipped,
          currentFile: finalFilename,
          statusText: `Failed: ${finalFilename} (${errMsg})`
        });
      }
    }
  }
  const workers = Array.from({ length: concurrency }, () => downloadWorker());
  await Promise.all(workers);
  for (const [d, arch] of dirArchives.entries()) {
    await saveArchive(d, arch);
  }
  return { downloaded, skipped, errors };
}

// src/lib/engines/filters.ts
function parseDateBoundary(input, boundary) {
  if (input === void 0 || input === null) return void 0;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return void 0;
    return Math.floor(input.getTime() / 1e3);
  }
  if (typeof input === "number") {
    if (isNaN(input) || input <= 0) return void 0;
    if (input > 4e9) {
      return Math.floor(input / 1e3);
    }
    return Math.floor(input);
  }
  const trimmed = input.trim();
  if (!trimmed) return void 0;
  const relMatch = trimmed.match(/^(\d+)\s*(s|m|h|d|w|y)$/i);
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    const multipliers = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
      y: 31536e3
    };
    const offsetSeconds = amount * (multipliers[unit] ?? 86400);
    const nowSeconds = Math.floor(Date.now() / 1e3);
    return nowSeconds - offsetSeconds;
  }
  if (/^\d+$/.test(trimmed)) {
    if (trimmed.length === 4) {
      const year = parseInt(trimmed, 10);
      if (year >= 1990 && year <= 2100) {
        const date = boundary === "until" ? new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) : new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        if (!isNaN(date.getTime())) {
          return Math.floor(date.getTime() / 1e3);
        }
      }
    }
    if (trimmed.length === 8) {
      const year = parseInt(trimmed.slice(0, 4), 10);
      const month = parseInt(trimmed.slice(4, 6), 10) - 1;
      const day = parseInt(trimmed.slice(6, 8), 10);
      const date = new Date(Date.UTC(year, month, day, boundary === "until" ? 23 : 0, boundary === "until" ? 59 : 0, boundary === "until" ? 59 : 0));
      if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1e3);
      }
    }
    const num = parseInt(trimmed, 10);
    if (num > 4e9) {
      return Math.floor(num / 1e3);
    }
    return num;
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const year = parseInt(trimmed.slice(0, 4), 10);
    const month = parseInt(trimmed.slice(5, 7), 10);
    const date = boundary === "until" ? new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)) : new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1e3);
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const timeStr = boundary === "until" ? "T23:59:59.999Z" : "T00:00:00.000Z";
    const parsed2 = /* @__PURE__ */ new Date(`${trimmed}${timeStr}`);
    if (!isNaN(parsed2.getTime())) {
      return Math.floor(parsed2.getTime() / 1e3);
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return Math.floor(parsed.getTime() / 1e3);
  }
  return void 0;
}
function resolveDateFilter(input) {
  if (!input) return {};
  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === "all" || trimmed.toLowerCase() === "none") return {};
  if (trimmed.includes("..") || /\s+-\s+/.test(trimmed)) {
    const parts = trimmed.split(/\.\.|\s+-\s+/);
    return {
      since: parts[0]?.trim(),
      until: parts[1]?.trim()
    };
  }
  if (/^\d{4}$/.test(trimmed) || /^\d{4}-\d{2}$/.test(trimmed)) {
    return {
      since: trimmed,
      until: trimmed
    };
  }
  return {
    since: trimmed,
    until: void 0
  };
}
function parseLimit(input) {
  if (input === void 0 || input === null) return void 0;
  if (typeof input === "string") {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || trimmed === "all" || trimmed === "none" || trimmed === "0") return void 0;
  }
  const num = typeof input === "number" ? input : parseInt(String(input).trim(), 10);
  if (isNaN(num) || num <= 0) return void 0;
  return Math.floor(num);
}
function shouldIncludeItem(item, filters) {
  const reverseChrono = filters.reverseChronological ?? true;
  if (item.date !== void 0 && item.date !== null) {
    if (filters.until !== void 0 && item.date > filters.until) {
      return { include: false, stop: false };
    }
    if (filters.since !== void 0 && item.date < filters.since) {
      return { include: false, stop: reverseChrono };
    }
  }
  return { include: true, stop: false };
}
async function* filterMediaStream(items, filters) {
  const maxLimit = filters.limit;
  let count = 0;
  if (maxLimit !== void 0 && maxLimit <= 0) {
    return;
  }
  for await (const item of items) {
    if (maxLimit !== void 0 && count >= maxLimit) {
      break;
    }
    const { include, stop } = shouldIncludeItem(item, filters);
    if (include) {
      count++;
      yield item;
      if (maxLimit !== void 0 && count >= maxLimit) {
        break;
      }
    }
    if (stop) {
      break;
    }
  }
}

// src/lib/engines/gallery-dl.ts
import { spawn as spawn2 } from "child_process";
import path8 from "path";
import fs8 from "fs/promises";

// src/lib/engines/exec.ts
import fs7 from "fs";
import path7 from "path";

// src/lib/engines/fetcher.ts
import { spawn } from "child_process";
import { createWriteStream } from "fs";
import fs6 from "fs/promises";
import os4 from "os";
import path6 from "path";
import { Readable as Readable2 } from "stream";
import { pipeline as pipeline2 } from "stream/promises";
function getOpenNamiBinDir(env = process.env) {
  if (env.OPEN_NAMI_BIN_DIR && env.OPEN_NAMI_BIN_DIR.trim()) {
    return path6.resolve(env.OPEN_NAMI_BIN_DIR.trim());
  }
  const base = env.OPEN_NAMI_DIR && env.OPEN_NAMI_DIR.trim() ? env.OPEN_NAMI_DIR.trim() : os4.homedir();
  return path6.join(base, ".open-nami", "bin");
}
var YTDLP_RELEASE_BASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
var GALLERYDL_CODEBERG_API = "https://codeberg.org/api/v1/repos/mikf/gallery-dl/releases/latest";
var GALLERYDL_GITHUB_FALLBACK = "https://github.com/mikf/gallery-dl/releases/latest/download";
function ytDlpAssetName(platform = process.platform, arch = process.arch) {
  if (platform === "win32") return "yt-dlp.exe";
  if (platform === "darwin") return "yt-dlp_macos";
  return arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
}
function galleryDlAssetName(platform = process.platform) {
  if (platform === "win32") return "gallery-dl.exe";
  return "gallery-dl.bin";
}
function commandWorks(cmd, args, timeoutMs = 1e4) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { stdio: "ignore", timeout: timeoutMs });
    } catch {
      resolve(false);
      return;
    }
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}
function getBinaryVersion(executablePath) {
  return new Promise((resolve) => {
    let child;
    let out = "";
    try {
      child = spawn(executablePath, ["--version"]);
    } catch {
      resolve(void 0);
      return;
    }
    child.stdout?.on("data", (d) => {
      out += d.toString();
    });
    child.on("error", () => resolve(void 0));
    child.on("close", (code) => {
      if (code === 0 && out.trim()) {
        resolve(out.trim());
      } else {
        resolve(void 0);
      }
    });
  });
}
async function downloadBinary(url, targetFile, signal) {
  await fs6.mkdir(path6.dirname(targetFile), { recursive: true });
  const response = await fetch(url, {
    signal,
    headers: { "User-Agent": "open-nami" }
  });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download binary from ${url} (HTTP ${response.status}). Check your connection and try again.`);
  }
  const tmp = `${targetFile}.download`;
  try {
    await pipeline2(Readable2.fromWeb(response.body), createWriteStream(tmp), { signal });
    try {
      await fs6.chmod(tmp, 493);
    } catch {
    }
    const stats = await fs6.stat(tmp);
    if (stats.size < 100 * 1024) {
      throw new Error(`Downloaded binary from ${url} is unexpectedly small (${stats.size} bytes). File may be incomplete or corrupted.`);
    }
    await fs6.rename(tmp, targetFile);
    return targetFile;
  } catch (err) {
    try {
      await fs6.unlink(tmp);
    } catch {
    }
    throw err;
  }
}
async function downloadLatestYtDlp(targetDir, signal, onStatus) {
  const dir = targetDir || getOpenNamiBinDir();
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const local = path6.join(dir, binaryName);
  const asset = ytDlpAssetName();
  const url = `${YTDLP_RELEASE_BASE}/${asset}`;
  onStatus?.(`fetching latest yt-dlp (${asset})\u2026`);
  return await downloadBinary(url, local, signal);
}
async function getGalleryDlDownloadUrls(assetName, fetchFn = fetch, signal) {
  const urls = [];
  try {
    const res = await fetchFn(GALLERYDL_CODEBERG_API, {
      signal,
      headers: { "User-Agent": "open-nami" }
    });
    if (res.ok) {
      const data = await res.json();
      const asset = data.assets?.find((a) => a.name === assetName);
      const downloadUrl = asset?.browser_download_url || asset?.download_url;
      if (downloadUrl) {
        urls.push(downloadUrl);
      } else if (data.tag_name) {
        urls.push(`https://codeberg.org/mikf/gallery-dl/releases/download/${data.tag_name}/${assetName}`);
      }
    }
  } catch {
  }
  urls.push(`${GALLERYDL_GITHUB_FALLBACK}/${assetName}`);
  return urls;
}
async function downloadLatestGalleryDl(targetDir, signal, onStatus) {
  if (process.platform === "darwin") {
    throw new Error(
      "Standalone gallery-dl binary is not distributed for macOS. Please install it via Homebrew: 'brew install gallery-dl'"
    );
  }
  const dir = targetDir || getOpenNamiBinDir();
  const binaryName = process.platform === "win32" ? "gallery-dl.exe" : "gallery-dl";
  const local = path6.join(dir, binaryName);
  const asset = galleryDlAssetName();
  const candidateUrls = await getGalleryDlDownloadUrls(asset, fetch, signal);
  let lastError;
  for (const url of candidateUrls) {
    try {
      onStatus?.("fetching gallery-dl from Codeberg / GitHub\u2026");
      return await downloadBinary(url, local, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw new Error(`Could not download gallery-dl (${lastError?.message || "unknown error"}). Check your connection and try again.`);
}
async function ensureYtDlp(onStatus, signal) {
  if (await commandWorks("yt-dlp", ["--version"])) return "yt-dlp";
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const local = path6.join(getOpenNamiBinDir(), binaryName);
  if (await commandWorks(local, ["--version"])) return local;
  if (await commandWorks("python", ["-m", "yt_dlp", "--version"])) return "python";
  if (await commandWorks("python3", ["-m", "yt_dlp", "--version"])) return "python3";
  onStatus?.("first run: downloading standalone yt-dlp\u2026");
  return await downloadLatestYtDlp(getOpenNamiBinDir(), signal, onStatus);
}
async function ensureGalleryDl(onStatus, signal) {
  if (await commandWorks("gallery-dl", ["--version"])) return "gallery-dl";
  const binaryName = process.platform === "win32" ? "gallery-dl.exe" : "gallery-dl";
  const local = path6.join(getOpenNamiBinDir(), binaryName);
  if (await commandWorks(local, ["--version"])) return local;
  if (await commandWorks("python", ["-m", "gallery_dl", "--version"])) return "python";
  if (await commandWorks("python3", ["-m", "gallery_dl", "--version"])) return "python3";
  onStatus?.("first run: downloading standalone gallery-dl\u2026");
  return await downloadLatestGalleryDl(getOpenNamiBinDir(), signal, onStatus);
}
async function updateYtDlp(options) {
  const onStatus = options?.onStatus ?? (() => {
  });
  const signal = options?.signal;
  const dir = getOpenNamiBinDir();
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const local = path6.join(dir, binaryName);
  let previousVersion;
  if (await commandWorks(local, ["--version"])) {
    previousVersion = await getBinaryVersion(local);
  } else if (await commandWorks("yt-dlp", ["--version"])) {
    previousVersion = await getBinaryVersion("yt-dlp");
  }
  onStatus("fetching fresh standalone yt-dlp release\u2026");
  const downloadedPath = await downloadLatestYtDlp(dir, signal, onStatus);
  const currentVersion = await getBinaryVersion(downloadedPath) ?? "unknown";
  return {
    engine: "yt-dlp",
    previousVersion,
    currentVersion,
    updated: previousVersion !== currentVersion
  };
}
async function updateGalleryDl(options) {
  const onStatus = options?.onStatus ?? (() => {
  });
  const signal = options?.signal;
  const dir = getOpenNamiBinDir();
  const binaryName = process.platform === "win32" ? "gallery-dl.exe" : "gallery-dl";
  const local = path6.join(dir, binaryName);
  let previousVersion;
  if (await commandWorks(local, ["--version"])) {
    previousVersion = await getBinaryVersion(local);
  } else if (await commandWorks("gallery-dl", ["--version"])) {
    previousVersion = await getBinaryVersion("gallery-dl");
  }
  onStatus("fetching fresh standalone gallery-dl release\u2026");
  const downloadedPath = await downloadLatestGalleryDl(dir, signal, onStatus);
  const currentVersion = await getBinaryVersion(downloadedPath) ?? "unknown";
  return {
    engine: "gallery-dl",
    previousVersion,
    currentVersion,
    updated: previousVersion !== currentVersion
  };
}

// src/lib/engines/exec.ts
function findExecutable(binName, pathEnv = process.env.PATH || "") {
  if (!pathEnv) return null;
  const delimiter = path7.delimiter;
  const dirs = pathEnv.split(delimiter).filter(Boolean);
  const isWin = process.platform === "win32";
  const extensions = isWin ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const dir of dirs) {
    for (const ext of extensions) {
      const fullPath = path7.join(dir, `${binName}${ext}`);
      try {
        if (fs7.existsSync(fullPath)) {
          const stat = fs7.statSync(fullPath);
          if (stat.isFile()) {
            return fullPath;
          }
        }
      } catch {
      }
    }
  }
  return null;
}
function resolveEngineCommand(engine, options = {}) {
  const env = options.env ?? process.env;
  const finder = options.findExe ?? ((name) => findExecutable(name, env.PATH));
  const customOverride = engine === "gallery-dl" ? env.GALLERY_DL_PATH || env.GALLERY_DL_BINARY : env.YT_DLP_PATH || env.YT_DLP_BINARY;
  if (customOverride && customOverride.trim()) {
    return {
      command: customOverride.trim(),
      baseArgs: []
    };
  }
  const standalone = finder(engine);
  if (standalone) {
    return {
      command: standalone,
      baseArgs: []
    };
  }
  const binDir = getOpenNamiBinDir(env);
  const isWin = process.platform === "win32";
  const localBin = path7.join(binDir, `${engine}${isWin ? ".exe" : ""}`);
  try {
    if (fs7.existsSync(localBin)) {
      const stat = fs7.statSync(localBin);
      if (stat.isFile()) {
        return {
          command: localBin,
          baseArgs: []
        };
      }
    }
  } catch {
  }
  const moduleName = engine === "gallery-dl" ? "gallery_dl" : "yt_dlp";
  const pythonExe = finder("python");
  if (pythonExe) {
    return {
      command: pythonExe,
      baseArgs: ["-m", moduleName]
    };
  }
  const python3Exe = finder("python3");
  if (python3Exe) {
    return {
      command: python3Exe,
      baseArgs: ["-m", moduleName]
    };
  }
  return {
    command: "python",
    baseArgs: ["-m", moduleName]
  };
}

// src/lib/engines/gallery-dl.ts
var PHOTO_FILTER = "extension in ('jpg','jpeg','png','gif','webp','bmp','jfif','heic','avif','tiff','svg')";
var VIDEO_FILTER = "extension in ('mp4','mov','webm','mkv','avi','flv','m4v')";
var GDL_ARCHIVE = "archive_gallery-dl.sqlite3";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var PLATFORM_SLEEP = {
  tiktok: "0.6-1.2",
  instagram: "1.0-1.8",
  facebook: "1.0-1.8"
};
function buildGalleryDlArgs(options) {
  const { destDir, subDir, platform, cleanUrl, username, cookiePath, cookiesFromBrowser, writeMetadata } = options;
  const args = [
    "-D",
    destDir,
    "-o",
    `user-agent=${UA}`,
    "-o",
    "cookies-update=false",
    "-o",
    'headers.sec-ch-ua="Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "-o",
    "headers.sec-ch-ua-mobile=?0",
    "-o",
    'headers.sec-ch-ua-platform="Windows"',
    "--download-archive",
    path8.join(destDir, GDL_ARCHIVE),
    "--retries",
    "3",
    "--sleep-429",
    "10"
  ];
  if (writeMetadata) {
    args.push("--write-metadata");
  }
  let targetUrl = cleanUrl;
  const sleepDelay = PLATFORM_SLEEP[platform] || "0.8-1.5";
  if (subDir === "Photos") {
    args.push("--filter", PHOTO_FILTER);
    if (platform === "tiktok") {
      args.push("-o", "videos=false", "-o", "audio=false");
    } else if (platform === "instagram") {
      args.push("-o", "videos=false");
    }
    args.push("--sleep-request", sleepDelay);
  } else if (subDir === "Videos") {
    args.push("--filter", VIDEO_FILTER);
    args.push("--sleep-request", sleepDelay);
  } else if (subDir === "Stories") {
    if (platform === "instagram") {
      targetUrl = `https://www.instagram.com/stories/${encodeURIComponent(username)}/`;
      args.push("--sleep-request", "1.0-1.8");
    }
  } else if (subDir === "Highlights") {
    if (platform === "instagram") {
      targetUrl = `https://www.instagram.com/${encodeURIComponent(username)}/highlights/`;
      args.push("--sleep-request", "1.0-1.8");
    }
  }
  if (cookiePath) {
    args.push("--cookies", cookiePath);
  }
  if (cookiesFromBrowser && cookiesFromBrowser !== "none") {
    args.push("--cookies-from-browser", cookiesFromBrowser);
  }
  args.push("--", targetUrl);
  return args;
}
async function runGalleryDl(options) {
  const { profile, targetDir, subDir, cookiePath, onProgress } = options;
  const destDir = subDir === "All" ? targetDir : path8.join(targetDir, subDir);
  await fs8.mkdir(destDir, { recursive: true });
  const args = buildGalleryDlArgs({
    destDir,
    subDir,
    platform: profile.platform,
    cleanUrl: profile.cleanUrl,
    username: profile.username,
    cookiePath,
    cookiesFromBrowser: options.cookiesFromBrowser,
    writeMetadata: options.writeMetadata
  });
  let downloadedCount = 0;
  let skippedCount = 0;
  let errorOutput = "";
  let engineCmdStr = "gallery-dl";
  try {
    engineCmdStr = await ensureGalleryDl((status) => {
      onProgress?.({
        job: subDir,
        downloadedCount: 0,
        skippedCount: 0,
        statusText: status
      });
    }, options.signal);
  } catch (err) {
    return {
      success: false,
      downloaded: 0,
      skipped: 0,
      error: err.message || String(err)
    };
  }
  const engineCmd = engineCmdStr.includes(path8.sep) ? { command: engineCmdStr, baseArgs: [] } : resolveEngineCommand("gallery-dl");
  const fullArgs = [...engineCmd.baseArgs, ...args];
  return new Promise((resolve) => {
    onProgress?.({
      job: subDir,
      downloadedCount,
      skippedCount,
      statusText: "downloading with gallery-dl\u2026"
    });
    const child = spawn2(engineCmd.command, fullArgs, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      signal: options.signal
    });
    const handleLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("#")) {
        skippedCount++;
        const filename = path8.basename(trimmed.slice(1).trim());
        onProgress?.({
          job: subDir,
          downloadedCount,
          skippedCount,
          currentFile: filename,
          statusText: `Skipped: ${filename}`
        });
      } else if (trimmed.match(/\.(jpe?g|png|gif|webp|bmp|jfif|heic|avif|tiff|svg|mp4|mov|webm|mkv|avi|flv|m4v)$/i) || trimmed.includes(path8.sep)) {
        downloadedCount++;
        const filename = path8.basename(trimmed);
        onProgress?.({
          job: subDir,
          downloadedCount,
          skippedCount,
          currentFile: filename,
          statusText: `Downloaded: ${filename}`
        });
      }
    };
    let stdoutBuffer = "";
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) handleLine(line);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      errorOutput += text;
      if (text.includes("429 Too Many Requests") || text.includes("Waiting for")) {
        onProgress?.({
          job: subDir,
          downloadedCount,
          skippedCount,
          statusText: "rate-limited by platform, waiting\u2026"
        });
      }
    });
    child.on("close", (code) => {
      if (stdoutBuffer) handleLine(stdoutBuffer);
      resolve({
        success: code === 0,
        downloaded: downloadedCount,
        skipped: skippedCount,
        error: code !== 0 ? errorOutput.slice(-300) : void 0
      });
    });
    child.on("error", (err) => {
      resolve({
        success: false,
        downloaded: downloadedCount,
        skipped: skippedCount,
        error: err.message
      });
    });
  });
}

// src/lib/engines/yt-dlp.ts
import { spawn as spawn3 } from "child_process";
import path9 from "path";
import fs9 from "fs/promises";
var YTDLP_ARCHIVE = "archive_yt-dlp.txt";
var UA2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
function buildYtDlpArgs(options) {
  const { destDir, platform, cleanUrl, cookiePath, cookiesFromBrowser, writeMetadata } = options;
  const args = [
    "-o",
    path9.join(destDir, "%(title).150B [%(id)s].%(ext)s"),
    "--windows-filenames",
    "--newline",
    "--ignore-errors",
    "--no-overwrites",
    "--user-agent",
    UA2,
    "--download-archive",
    path9.join(destDir, YTDLP_ARCHIVE),
    "--concurrent-fragments",
    "4",
    "--retries",
    "3",
    "--fragment-retries",
    "5",
    "--impersonate",
    "chrome"
  ];
  if (platform === "tiktok") {
    args.push("--sleep-requests", "0.5:1.2", "--retry-sleep", "429:exp=5:30");
  } else if (platform === "instagram") {
    args.push("--sleep-requests", "1.0:2.0", "--retry-sleep", "429:exp=5:30");
  } else if (platform === "x") {
    args.push("--sleep-requests", "0.8:1.8", "--retry-sleep", "429:exp=5:30");
  }
  if (writeMetadata) {
    args.push("--write-info-json", "--write-description");
  }
  if (cookiePath) {
    args.push("--cookies", cookiePath);
  }
  if (cookiesFromBrowser && cookiesFromBrowser !== "none") {
    args.push("--cookies-from-browser", cookiesFromBrowser);
  }
  args.push("--", cleanUrl);
  return args;
}
async function runYtDlp(options) {
  const { profile, targetDir, cookiePath, onProgress } = options;
  const destDir = path9.join(targetDir, "Videos");
  await fs9.mkdir(destDir, { recursive: true });
  const args = buildYtDlpArgs({
    destDir,
    platform: profile.platform,
    cleanUrl: profile.cleanUrl,
    cookiePath,
    cookiesFromBrowser: options.cookiesFromBrowser,
    writeMetadata: options.writeMetadata
  });
  let downloadedCount = 0;
  let skippedCount = 0;
  let errorOutput = "";
  let engineCmdStr = "yt-dlp";
  try {
    engineCmdStr = await ensureYtDlp((status) => {
      onProgress?.({
        job: "Videos",
        downloadedCount: 0,
        skippedCount: 0,
        statusText: status
      });
    }, options.signal);
  } catch (err) {
    return {
      success: false,
      downloaded: 0,
      skipped: 0,
      error: err.message || String(err)
    };
  }
  const engineCmd = engineCmdStr.includes(path9.sep) ? { command: engineCmdStr, baseArgs: [] } : resolveEngineCommand("yt-dlp");
  const fullArgs = [...engineCmd.baseArgs, ...args];
  return new Promise((resolve) => {
    onProgress?.({
      job: "Videos",
      downloadedCount,
      skippedCount,
      statusText: "downloading with yt-dlp\u2026"
    });
    const child = spawn3(engineCmd.command, fullArgs, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      signal: options.signal
    });
    const handleLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.includes("has already been recorded in the archive") || trimmed.includes("[download] Destination:") && trimmed.includes("already exists")) {
        skippedCount++;
        onProgress?.({
          job: "Videos",
          downloadedCount,
          skippedCount,
          statusText: "Skipped: Already archived"
        });
      } else if (trimmed.includes("[download] Destination:")) {
        const dest = trimmed.replace("[download] Destination:", "").trim();
        const filename = path9.basename(dest);
        onProgress?.({
          job: "Videos",
          downloadedCount,
          skippedCount,
          currentFile: filename,
          statusText: `Downloading: ${filename}`
        });
      } else if (trimmed.includes("100% of")) {
        downloadedCount++;
        onProgress?.({
          job: "Videos",
          downloadedCount,
          skippedCount,
          statusText: `Completed ${downloadedCount} videos`
        });
      } else if (trimmed.startsWith("ERROR:")) {
        errorOutput += trimmed + "\n";
      }
    };
    let stdoutBuffer = "";
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) handleLine(line);
    });
    let stderrBuffer = "";
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderrBuffer += text;
      const lines = stderrBuffer.split(/\r?\n/);
      stderrBuffer = lines.pop() || "";
      for (const line of lines) handleLine(line);
    });
    child.on("close", (code) => {
      if (stdoutBuffer) handleLine(stdoutBuffer);
      if (stderrBuffer) handleLine(stderrBuffer);
      resolve({
        success: code === 0 || downloadedCount > 0,
        downloaded: downloadedCount,
        skipped: skippedCount,
        error: code !== 0 && downloadedCount === 0 ? errorOutput.slice(-300) : void 0
      });
    });
    child.on("error", (err) => {
      resolve({
        success: false,
        downloaded: downloadedCount,
        skipped: skippedCount,
        error: err.message
      });
    });
  });
}

// src/lib/engines/core/task-manager.ts
import path12 from "path";
import os7 from "os";
import fs12 from "fs/promises";
import fsSync from "fs";

// src/lib/engines/core/event-bus.ts
import { EventEmitter } from "events";
var EngineEventBus = class {
  emitter = new EventEmitter();
  constructor() {
    this.emitter.setMaxListeners(50);
  }
  on(event, listener) {
    this.emitter.on(event, listener);
    return () => this.emitter.off(event, listener);
  }
  off(event, listener) {
    this.emitter.off(event, listener);
  }
  once(event, listener) {
    this.emitter.once(event, listener);
  }
  emit(event, payload) {
    return this.emitter.emit(event, payload);
  }
  removeAllListeners(event) {
    if (event !== void 0) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
};

// src/lib/engines/storage/ledger.ts
import fs10 from "fs";
import path10 from "path";
import os5 from "os";
import { createRequire } from "module";
var require2 = createRequire(import.meta.url);
var MediaLedger = class {
  db = null;
  inMemoryFallback = {
    media: /* @__PURE__ */ new Map(),
    checkpoints: /* @__PURE__ */ new Map()
  };
  isFallback = false;
  resolvedPath;
  constructor(dbPath, forceFallback = false) {
    const resolvedPath = dbPath ?? (forceFallback ? ":memory:" : path10.join(os5.homedir(), ".open-nami", "nami.db"));
    this.resolvedPath = resolvedPath;
    if (forceFallback) {
      this.isFallback = true;
      this.loadFallbackDisk();
      return;
    }
    try {
      if (resolvedPath !== ":memory:") {
        fs10.mkdirSync(path10.dirname(resolvedPath), { recursive: true });
      }
      const { DatabaseSync } = require2("node:sqlite");
      this.db = new DatabaseSync(resolvedPath);
      this.initTables();
    } catch {
      this.isFallback = true;
      this.loadFallbackDisk();
    }
  }
  loadFallbackDisk() {
    if (this.resolvedPath === ":memory:") return;
    try {
      if (fs10.existsSync(this.resolvedPath)) {
        const raw = fs10.readFileSync(this.resolvedPath, "utf8");
        const data = JSON.parse(raw);
        if (data && typeof data === "object") {
          if (data.media && typeof data.media === "object") {
            for (const [k, v] of Object.entries(data.media)) {
              this.inMemoryFallback.media.set(k, v);
            }
          }
          if (data.checkpoints && typeof data.checkpoints === "object") {
            for (const [k, v] of Object.entries(data.checkpoints)) {
              this.inMemoryFallback.checkpoints.set(k, v);
            }
          }
        }
      }
    } catch {
    }
  }
  flushFallbackDisk() {
    if (this.resolvedPath === ":memory:") return;
    try {
      fs10.mkdirSync(path10.dirname(this.resolvedPath), { recursive: true });
      const data = {
        media: Object.fromEntries(this.inMemoryFallback.media),
        checkpoints: Object.fromEntries(this.inMemoryFallback.checkpoints)
      };
      fs10.writeFileSync(this.resolvedPath, JSON.stringify(data, null, 2), "utf8");
    } catch {
    }
  }
  initTables() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_ledger (
        id TEXT PRIMARY KEY,
        platform TEXT,
        author TEXT,
        url TEXT,
        filename TEXT,
        file_path TEXT,
        downloaded_at TEXT
      );
      CREATE TABLE IF NOT EXISTS checkpoints (
        key TEXT PRIMARY KEY,
        platform TEXT,
        username TEXT,
        target_dir TEXT,
        cursors_json TEXT,
        updated_at TEXT
      );
    `);
  }
  hasMedia(id) {
    if (this.isFallback || !this.db) {
      return this.inMemoryFallback.media.has(id);
    }
    const stmt = this.db.prepare("SELECT 1 FROM media_ledger WHERE id = ?");
    const row = stmt.get(id);
    return Boolean(row);
  }
  recordMedia(media) {
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.media.set(media.id, media);
      this.flushFallbackDisk();
      return;
    }
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO media_ledger (id, platform, author, url, filename, file_path, downloaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      media.id,
      media.platform,
      media.author,
      media.url,
      media.filename,
      media.filePath,
      media.downloadedAt
    );
  }
  saveCheckpoint(checkpoint) {
    const key = `${checkpoint.platform}:${checkpoint.username.toLowerCase()}`;
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.checkpoints.set(key, checkpoint);
      this.flushFallbackDisk();
      return;
    }
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO checkpoints (key, platform, username, target_dir, cursors_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      key,
      checkpoint.platform,
      checkpoint.username,
      checkpoint.targetDir,
      JSON.stringify(checkpoint.cursors),
      checkpoint.updatedAt
    );
  }
  getCheckpoint(platform, username) {
    const key = `${platform}:${username.toLowerCase()}`;
    if (this.isFallback || !this.db) {
      return this.inMemoryFallback.checkpoints.get(key) || null;
    }
    const stmt = this.db.prepare(
      "SELECT platform, username, target_dir, cursors_json, updated_at FROM checkpoints WHERE key = ?"
    );
    const row = stmt.get(key);
    if (!row) return null;
    return {
      platform: row.platform,
      username: row.username,
      targetDir: row.target_dir,
      cursors: JSON.parse(row.cursors_json || "{}"),
      updatedAt: row.updated_at
    };
  }
  clearCheckpoint(platform, username) {
    const key = `${platform}:${username.toLowerCase()}`;
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.checkpoints.delete(key);
      this.flushFallbackDisk();
      return;
    }
    const stmt = this.db.prepare("DELETE FROM checkpoints WHERE key = ?");
    stmt.run(key);
  }
  close() {
    if (this.db) {
      try {
        this.db.close();
      } catch {
      }
      this.db = null;
    }
  }
};

// src/lib/known-folders.ts
import { execFileSync } from "child_process";
import fs11 from "fs";
import os6 from "os";
import path11 from "path";
var KNOWN_FOLDER_DOWNLOADS_GUID = "{374DE290-123F-4565-9164-39C4925E467B}";
var USER_SHELL_FOLDERS_REG_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders";
function expandWindowsEnv(str, env = process.env, homeDir) {
  return str.replace(/%([^%]+)%/g, (original, name) => {
    if (homeDir && name.toLowerCase() === "userprofile") {
      return homeDir;
    }
    const key = Object.keys(env).find((k) => k.toLowerCase() === name.toLowerCase());
    if (key && env[key] !== void 0) {
      return env[key];
    }
    return original;
  });
}
function parseWindowsRegistryOutput(output, targetKey = KNOWN_FOLDER_DOWNLOADS_GUID) {
  const lines = output.split(/\r?\n/);
  const escaped = targetKey.replace(/[{}]/g, "\\$&");
  const pattern = new RegExp(`^\\s*${escaped}\\s+REG_\\w+\\s+(.*)$`, "i");
  for (const line of lines) {
    const match = line.match(pattern);
    if (match && match[1]) {
      const rawPath = match[1].trim();
      if (rawPath) return rawPath;
    }
  }
  return void 0;
}
function parseLinuxUserDirsOutput(content) {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^XDG_DOWNLOAD_DIR=["']?([^"']+)["']?$/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return void 0;
}
function isPathDriveAccessible(filePath, fsExists = fs11.existsSync, platform = process.platform) {
  try {
    if (fsExists(filePath)) {
      return true;
    }
    if (platform === "win32") {
      const match = filePath.match(/^([a-zA-Z]:[\\/])/i);
      const driveRoot = match ? match[1] : path11.win32.parse(path11.win32.resolve(filePath)).root;
      return fsExists(driveRoot);
    }
    const normalized = filePath.replace(/\\/g, "/");
    const mountMatch = normalized.match(/^(\/(?:media(?:\/[^/]+)?|mnt|run\/media(?:\/[^/]+)?)\/[^/]+)/);
    if (mountMatch) {
      return fsExists(mountMatch[1]);
    }
    let curr = path11.posix.dirname(normalized);
    while (curr && curr !== "/") {
      if (fsExists(curr)) return true;
      curr = path11.posix.dirname(curr);
    }
    return fsExists("/");
  } catch {
    return false;
  }
}
function resolveWindowsDownloadsDir(options = {}) {
  const homeDir = options.homeDir ?? os6.homedir();
  const env = options.env ?? process.env;
  const runQuery = options.regQueryFn ?? ((key, value) => {
    try {
      return execFileSync("reg", ["query", key, "/v", value], {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"]
      });
    } catch {
      return "";
    }
  });
  const checkAccessible = options.driveAccessibleFn ?? ((p) => isPathDriveAccessible(p, fs11.existsSync, "win32"));
  let raw = parseWindowsRegistryOutput(
    runQuery(USER_SHELL_FOLDERS_REG_KEY, KNOWN_FOLDER_DOWNLOADS_GUID),
    KNOWN_FOLDER_DOWNLOADS_GUID
  );
  if (!raw) {
    raw = parseWindowsRegistryOutput(runQuery(USER_SHELL_FOLDERS_REG_KEY, "Downloads"), "Downloads");
  }
  if (raw) {
    const expanded = expandWindowsEnv(raw, env, homeDir);
    if (checkAccessible(expanded)) {
      return path11.win32.resolve(expanded);
    }
  }
  return void 0;
}
function resolveLinuxDownloadsDir(options = {}) {
  const homeDir = options.homeDir ?? os6.homedir();
  const env = options.env ?? process.env;
  const readFn = options.readFileFn ?? ((p) => {
    try {
      return fs11.readFileSync(p, "utf8");
    } catch {
      return "";
    }
  });
  const checkAccessible = options.driveAccessibleFn ?? ((p) => isPathDriveAccessible(p, fs11.existsSync, "linux"));
  const configHome = env.XDG_CONFIG_HOME || path11.join(homeDir, ".config");
  const userDirsFile = path11.join(configHome, "user-dirs.dirs");
  const content = readFn(userDirsFile);
  if (!content) return void 0;
  const raw = parseLinuxUserDirsOutput(content);
  if (!raw) return void 0;
  const expanded = raw.replace(/\$HOME/g, homeDir).replace(/\$\{HOME\}/g, homeDir);
  if (checkAccessible(expanded)) {
    return path11.posix.resolve(expanded);
  }
  return void 0;
}
function resolvePlatformDownloadsDir(options = {}) {
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? os6.homedir();
  const defaultFallback = path11.join(homeDir, "Downloads");
  if (platform === "win32") {
    const resolved = resolveWindowsDownloadsDir(options);
    if (resolved) return resolved;
  } else if (platform === "linux") {
    const resolved = resolveLinuxDownloadsDir(options);
    if (resolved) return resolved;
  }
  return defaultFallback;
}

// src/lib/engines/core/task-manager.ts
function expandPath(dir) {
  if (dir.startsWith("~/") || dir.startsWith("~\\") || dir === "~") {
    return path12.join(os7.homedir(), dir.slice(1));
  }
  return dir;
}
function resolveDownloadBaseDir(customBaseDir) {
  if (customBaseDir && customBaseDir.trim()) {
    return path12.resolve(expandPath(customBaseDir.trim()));
  }
  const envDir = process.env.OPEN_NAMI_DIR || process.env.NAMI_DIR;
  if (envDir && envDir.trim()) {
    return path12.resolve(expandPath(envDir.trim()));
  }
  const configDir = loadConfig().downloadDir;
  if (configDir && configDir.trim()) {
    return path12.resolve(expandPath(configDir.trim()));
  }
  if (process.env.NAMI_BASE_DIR && process.env.NAMI_BASE_DIR.trim()) {
    const raw = process.env.NAMI_BASE_DIR.trim();
    return path12.resolve(expandPath(raw.endsWith("downloads") ? raw : path12.join(raw, "downloads")));
  }
  return path12.join(resolvePlatformDownloadsDir(), "Open Nami");
}
function resolveDefaultDownloadDir(platform, username, baseDir) {
  const root = resolveDownloadBaseDir(baseDir);
  return path12.join(root, platform, username);
}
async function cleanupEmptyCategoryDirs(targetDir) {
  const candidateDirs = ["All", "Stories", "Highlights", "Photos", "Videos"];
  for (const dirName of candidateDirs) {
    const fullPath = path12.join(targetDir, dirName);
    try {
      if (!fsSync.existsSync(fullPath)) continue;
      const entries = await fs12.readdir(fullPath);
      const nonArchiveEntries = entries.filter(
        (e) => e !== ".open-nami-archive.json" && e !== "archive.txt" && e !== "archive_yt-dlp.txt" && e !== "archive_gallery-dl.sqlite3"
      );
      if (nonArchiveEntries.length === 0) {
        for (const entry of entries) {
          try {
            await fs12.unlink(path12.join(fullPath, entry));
          } catch {
          }
        }
        await fs12.rmdir(fullPath).catch(() => {
        });
      }
    } catch {
    }
  }
}
var TaskManager = class {
  events;
  ledger;
  plugins;
  constructor(eventBus, ledger, plugins) {
    this.events = eventBus || new EngineEventBus();
    this.ledger = ledger || new MediaLedger();
    this.plugins = plugins || defaultPluginRegistry;
  }
  async execute(options) {
    const { profile, choice } = options;
    const targetDir = options.outputDir || resolveDefaultDownloadDir(profile.platform, profile.username);
    this.events.emit("job:start", { profile, choice, outputDir: targetDir });
    let downloadedCount = 0;
    let skippedCount = 0;
    const errors = [];
    if (options.runnerOverrides?.nativeRunner) {
      const subDir = choice === "all" ? "All" : choice.charAt(0).toUpperCase() + choice.slice(1);
      const runRes = await options.runnerOverrides.nativeRunner(subDir);
      downloadedCount += runRes.downloaded;
      skippedCount += runRes.skipped;
      if (!runRes.success) errors.push(runRes.error || "Execution failed");
    }
    await cleanupEmptyCategoryDirs(targetDir);
    const result = {
      success: errors.length === 0,
      downloadedCount,
      skippedCount,
      errors,
      outputDir: targetDir
    };
    this.events.emit("job:complete", { result });
    return result;
  }
};
var defaultTaskManager = new TaskManager();

// src/lib/engines/dispatcher.ts
var REFERER_MAP = {
  tiktok: "https://www.tiktok.com/",
  instagram: "https://www.instagram.com/",
  x: "https://x.com/",
  facebook: "https://www.facebook.com/"
};
async function dispatchDownload(options) {
  const { profile, choice, onProgress } = options;
  const targetDir = options.outputDir || resolveDefaultDownloadDir(profile.platform, profile.username);
  await fs13.mkdir(targetDir, { recursive: true });
  const rawBrowserPref = options.cookiesFromBrowser ?? loadConfig().cookiesFromBrowser ?? "auto";
  const resolvedBrowserArg = resolveBrowserCookieArg(rawBrowserPref);
  const cookiesFromBrowser = resolvedBrowserArg ?? void 0;
  defaultTaskManager.events.emit("job:start", { profile, choice, outputDir: targetDir });
  const masterCookie = findCookieFile(profile.platform);
  const cookieCopy = masterCookie ? await createSafeCookieCopy(masterCookie) : null;
  let totalDownloaded = 0;
  let totalSkipped = 0;
  const errors = [];
  const recordError = (err) => {
    errors.push(err);
    defaultTaskManager.events.emit("job:error", { error: err });
  };
  const handleProgress = (progress) => {
    defaultTaskManager.events.emit("job:progress", progress);
    if (progress.currentFile && progress.statusText?.startsWith("Saved:")) {
      try {
        defaultTaskManager.ledger.recordMedia({
          id: `${profile.platform}:${profile.username}:${progress.currentFile}`,
          platform: profile.platform,
          author: profile.username,
          url: profile.cleanUrl || "",
          filename: progress.currentFile,
          filePath: path13.join(targetDir, progress.currentFile),
          downloadedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch {
      }
    }
    onProgress?.(progress);
  };
  try {
    const jobs = [];
    if (choice === "photos") {
      jobs.push({ type: "photos" });
    } else if (choice === "videos") {
      jobs.push({ type: "videos" });
    } else if (choice === "stories") {
      jobs.push({ type: "stories" });
    } else if (choice === "highlights") {
      jobs.push({ type: "highlights" });
    } else if (choice === "all") {
      jobs.push({ type: "all" });
      if (profile.platform === "instagram") {
        jobs.push({ type: "stories" });
        jobs.push({ type: "highlights" });
      }
    }
    const sinceSeconds = parseDateBoundary(options.since, "since");
    const untilSeconds = parseDateBoundary(options.until, "until");
    const globalLimit = parseLimit(options.limit);
    const savedCheckpoint = options.resume ? await loadCheckpoint(targetDir) : null;
    const currentCursors = savedCheckpoint?.cursors ? { ...savedCheckpoint.cursors } : {};
    const defaultRunNative = async (subDir) => {
      const dest = subDir === "All" ? targetDir : path13.join(targetDir, subDir);
      const remainingLimit = globalLimit !== void 0 ? Math.max(0, globalLimit - totalDownloaded) : void 0;
      if (remainingLimit === 0) {
        return { success: true, downloaded: 0, skipped: 0 };
      }
      try {
        const extractor = getExtractor(profile.platform);
        const subDirKey = subDir === "All" ? "timeline" : subDir.toLowerCase();
        const initialCursor = options.resume ? currentCursors[subDirKey] : void 0;
        const items = extractor.extract(profile, {
          subDir,
          cookiePath: cookieCopy?.filePath,
          signal: options.signal,
          since: sinceSeconds,
          until: untilSeconds,
          limit: remainingLimit,
          initialCursor,
          onCheckpoint: async (key, val) => {
            if (val) {
              currentCursors[key] = val;
            } else {
              delete currentCursors[key];
            }
            await saveCheckpoint(targetDir, {
              version: 1,
              platform: profile.platform,
              username: profile.username,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
              cursors: currentCursors,
              completed: Object.keys(currentCursors).length === 0
            });
          }
        });
        const filtered = filterMediaStream(items, {
          since: sinceSeconds,
          until: untilSeconds,
          limit: remainingLimit
        });
        const res = await downloadMediaStream(filtered, {
          jobName: `${profile.username} ${subDir}`,
          destDir: dest,
          destDirMap: subDir === "All" ? {
            photo: path13.join(targetDir, "Photos"),
            video: path13.join(targetDir, "Videos")
          } : void 0,
          cookiePath: cookieCopy?.filePath,
          referer: REFERER_MAP[profile.platform],
          signal: options.signal,
          limit: remainingLimit,
          writeMetadata: options.writeMetadata,
          defaultPlatform: profile.platform,
          defaultAuthor: profile.username,
          onProgress: handleProgress
        });
        return {
          success: res.errors.length === 0,
          downloaded: res.downloaded,
          skipped: res.skipped,
          ...res.errors.length > 0 ? { error: res.errors.join("; ") } : {}
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          downloaded: 0,
          skipped: 0,
          error: errMsg || "Execution failed"
        };
      }
    };
    const runNative = options.runnerOverrides?.nativeRunner ?? defaultRunNative;
    const runGdl = (subDir) => {
      const runnerOpts = {
        profile,
        targetDir,
        subDir,
        cookiePath: cookieCopy?.filePath,
        cookiesFromBrowser,
        signal: options.signal,
        writeMetadata: options.writeMetadata,
        onProgress: handleProgress
      };
      return options.runnerOverrides?.gdlRunner ? options.runnerOverrides.gdlRunner(subDir, runnerOpts) : runGalleryDl(runnerOpts);
    };
    const runYt = () => {
      const runnerOpts = {
        profile,
        targetDir,
        cookiePath: cookieCopy?.filePath,
        cookiesFromBrowser,
        signal: options.signal,
        writeMetadata: options.writeMetadata,
        onProgress: handleProgress
      };
      return options.runnerOverrides?.ytRunner ? options.runnerOverrides.ytRunner(runnerOpts) : runYtDlp(runnerOpts);
    };
    for (const job of jobs) {
      if (options.signal?.aborted) break;
      if (globalLimit !== void 0 && totalDownloaded >= globalLimit) break;
      if (job.type === "all") {
        let res = await runNative("All");
        if ((!res.success || res.downloaded === 0 && res.skipped === 0) && !options.signal?.aborted) {
          handleProgress({
            job: "Photos",
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: "switching to gallery-dl engine for photos\u2026"
          });
          const gdlPhotos = await runGdl("Photos");
          totalDownloaded += gdlPhotos.downloaded;
          totalSkipped += gdlPhotos.skipped;
          if (!gdlPhotos.success) recordError(gdlPhotos.error ? `[Photos] ${gdlPhotos.error}` : "[Photos] Execution failed");
          handleProgress({
            job: "Videos",
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: "switching to yt-dlp engine for videos\u2026"
          });
          const ytVideos = await runYt();
          if (ytVideos.downloaded > 0 || ytVideos.skipped > 0 || ytVideos.success) {
            totalDownloaded += ytVideos.downloaded;
            totalSkipped += ytVideos.skipped;
            if (!ytVideos.success) recordError(ytVideos.error ? `[Videos] ${ytVideos.error}` : "[Videos] Execution failed");
          } else if (!options.signal?.aborted) {
            handleProgress({
              job: "Videos",
              downloadedCount: totalDownloaded,
              skippedCount: totalSkipped,
              statusText: "switching to gallery-dl engine for videos\u2026"
            });
            const gdlVideos = await runGdl("Videos");
            totalDownloaded += gdlVideos.downloaded;
            totalSkipped += gdlVideos.skipped;
            if (!gdlVideos.success) recordError(gdlVideos.error ? `[Videos] ${gdlVideos.error}` : "[Videos] Execution failed");
          }
        } else {
          totalDownloaded += res.downloaded;
          totalSkipped += res.skipped;
          if (!res.success) recordError(res.error ? `[All] ${res.error}` : "[All] Execution failed");
        }
      } else if (job.type === "photos" || job.type === "stories" || job.type === "highlights") {
        const subDir = job.type === "photos" ? "Photos" : job.type === "stories" ? "Stories" : "Highlights";
        let res = await runNative(subDir);
        const isAuthError = Boolean(res.error && (res.error.includes("cookie") || res.error.includes("authenticated session") || res.error.includes("Settings (^s)")));
        if (!isAuthError && (!res.success || res.downloaded === 0 && res.skipped === 0) && !options.signal?.aborted) {
          handleProgress({
            job: subDir,
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: "switching to gallery-dl engine\u2026"
          });
          const gdlRes = await runGdl(subDir);
          if (gdlRes.downloaded > 0 || gdlRes.skipped > 0 || gdlRes.success && !res.error) {
            res = gdlRes;
          }
        }
        totalDownloaded += res.downloaded;
        totalSkipped += res.skipped;
        if (!res.success) recordError(res.error ? `[${subDir}] ${res.error}` : `[${subDir}] Execution failed`);
      } else if (job.type === "videos") {
        let res = await runNative("Videos");
        if (res.downloaded > 0 || res.skipped > 0) {
          totalDownloaded += res.downloaded;
          totalSkipped += res.skipped;
        } else if (!options.signal?.aborted) {
          handleProgress({
            job: "Videos",
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: "switching to yt-dlp engine\u2026"
          });
          const fbRes = await runYt();
          if (fbRes.downloaded > 0 || fbRes.skipped > 0 || fbRes.success) {
            totalDownloaded += fbRes.downloaded;
            totalSkipped += fbRes.skipped;
            if (!fbRes.success) recordError(fbRes.error ? `[Videos] ${fbRes.error}` : "[Videos] Execution failed");
          } else if (!options.signal?.aborted) {
            handleProgress({
              job: "Videos",
              downloadedCount: totalDownloaded,
              skippedCount: totalSkipped,
              statusText: "switching to gallery-dl engine\u2026"
            });
            const gdlRes = await runGdl("Videos");
            totalDownloaded += gdlRes.downloaded;
            totalSkipped += gdlRes.skipped;
            if (!gdlRes.success) recordError(gdlRes.error ? `[Videos] ${gdlRes.error}` : "[Videos] Execution failed");
          }
        }
      }
    }
    await cleanupEmptyCategoryDirs(targetDir);
    if (errors.length === 0 && !options.signal?.aborted) {
      await clearCheckpoint(targetDir);
    }
    const engineResult = {
      success: errors.length === 0 || totalDownloaded > 0,
      downloadedCount: totalDownloaded,
      skippedCount: totalSkipped,
      errors,
      outputDir: targetDir
    };
    defaultTaskManager.events.emit("job:complete", { result: engineResult });
    return engineResult;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    defaultTaskManager.events.emit("job:error", { error: errMsg || "Execution failed" });
    throw err;
  } finally {
    if (cookieCopy) {
      await cookieCopy.cleanup();
    }
  }
}

// src/components/views/picking-view.tsx
import { jsx as jsx8, jsxs as jsxs6 } from "react/jsx-runtime";
function ChoiceIndicator({ isSelected }) {
  const theme = useTheme();
  return /* @__PURE__ */ jsxs6(Box6, { children: [
    /* @__PURE__ */ jsx8(Text7, { color: theme.primary, children: "\u258E " }),
    /* @__PURE__ */ jsx8(Text7, { color: theme.primary, bold: true, children: isSelected ? "\u276F " : "  " })
  ] });
}
function ChoiceItem({
  isSelected,
  label,
  value,
  description
}) {
  const theme = useTheme();
  const rawTag = `[${value === "all" ? "EVERYTHING" : String(value || label).toUpperCase()}]`;
  const paddedTag = rawTag.padEnd(12, " ");
  return /* @__PURE__ */ jsxs6(Box6, { children: [
    /* @__PURE__ */ jsx8(
      Text7,
      {
        color: isSelected ? theme.background : theme.primary,
        backgroundColor: isSelected ? theme.primary : void 0,
        bold: isSelected,
        children: paddedTag
      }
    ),
    /* @__PURE__ */ jsx8(Text7, { color: theme.gray, children: "  " }),
    /* @__PURE__ */ jsx8(Text7, { color: isSelected ? theme.primary : theme.gray, dimColor: !isSelected, bold: isSelected, children: description || label })
  ] });
}
function getPickingOptions(platform) {
  const items = [
    { label: "Photos", value: "photos", description: "Feed images and carousels" },
    { label: "Videos", value: "videos", description: "Reels and timeline clips" }
  ];
  if (platform === "instagram") {
    items.push({ label: "Stories", value: "stories", description: "Active 24h stories" });
    items.push({ label: "Highlights", value: "highlights", description: "Saved story archive reels" });
  }
  items.push({
    label: "Everything",
    value: "all",
    description: "Complete profile download"
  });
  return items;
}
function PickingView({
  contentWidth,
  profile,
  outputDir,
  initialLimit,
  initialSince,
  initialUntil,
  initialWriteMetadata = false,
  initialResume = true,
  onSelect,
  onHighlight,
  theme,
  gapComponent: Gap2
}) {
  const platformName = profile.platform.charAt(0).toUpperCase() + profile.platform.slice(1);
  const items = getPickingOptions(profile.platform);
  const [hasCheckpoint, setHasCheckpoint] = useState4(false);
  const targetDir = resolveDefaultDownloadDir(profile.platform, profile.username, outputDir);
  useEffect4(() => {
    let isMounted = true;
    loadCheckpoint(targetDir).then((cp) => {
      if (isMounted && cp && !cp.completed && Object.keys(cp.cursors || {}).length > 0) {
        setHasCheckpoint(true);
      }
    }).catch(() => {
    });
    return () => {
      isMounted = false;
    };
  }, [targetDir]);
  const handleItemSelect = (selectedChoice) => {
    onSelect({
      choice: selectedChoice,
      limit: initialLimit,
      since: typeof initialSince === "string" ? initialSince : void 0,
      until: typeof initialUntil === "string" ? initialUntil : void 0,
      writeMetadata: initialWriteMetadata,
      resume: initialResume
    });
  };
  const boxWidth = Math.min(48, Math.max(44, (contentWidth || 80) - 8));
  return /* @__PURE__ */ jsxs6(Box6, { flexDirection: "column", alignItems: "center", width: "100%", children: [
    /* @__PURE__ */ jsxs6(Box6, { flexDirection: "column", alignItems: "center", marginBottom: 1, children: [
      /* @__PURE__ */ jsxs6(Text7, { bold: true, color: theme.primary, children: [
        "@",
        profile.username
      ] }),
      /* @__PURE__ */ jsx8(Gap2, {}),
      /* @__PURE__ */ jsxs6(Text7, { color: theme.gray, dimColor: theme.dimSecondary, children: [
        "\u25B8 ",
        platformName,
        profile.cleanUrl ? ` \xB7 ${profile.cleanUrl}` : ""
      ] }),
      /* @__PURE__ */ jsx8(Gap2, {}),
      /* @__PURE__ */ jsx8(Text7, { color: theme.gray, dimColor: theme.dimSecondary, children: "Select target media:" })
    ] }),
    /* @__PURE__ */ jsxs6(Box6, { flexDirection: "column", width: boxWidth, children: [
      /* @__PURE__ */ jsx8(
        SelectInput,
        {
          indicatorComponent: ChoiceIndicator,
          itemComponent: ChoiceItem,
          items: items.map((item, index) => ({
            key: String(index),
            label: item.label,
            value: item.value,
            description: item.description
          })),
          onSelect: (item) => handleItemSelect(item.value),
          onHighlight: (item) => onHighlight?.(item.value)
        }
      ),
      hasCheckpoint ? /* @__PURE__ */ jsxs6(Box6, { marginTop: 1, children: [
        /* @__PURE__ */ jsx8(Text7, { color: theme.primary, children: "\u258E " }),
        /* @__PURE__ */ jsx8(Text7, { color: theme.primary, bold: true, children: "\u26A1 Checkpoint found (cursor saved)" })
      ] }) : null
    ] })
  ] });
}

// src/components/views/platform-view.tsx
import { jsx as jsx9, jsxs as jsxs7 } from "react/jsx-runtime";
var PLATFORM_OPTIONS = [
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "Facebook", value: "facebook" },
  { label: "X (Twitter)", value: "x" }
];
function getPlatformOptions() {
  return PLATFORM_OPTIONS;
}
function PlatformView({
  contentWidth,
  username,
  onSelect,
  onHighlight,
  theme,
  gapComponent: Gap2
}) {
  const items = getPlatformOptions();
  return /* @__PURE__ */ jsxs7(Box7, { width: contentWidth, children: [
    /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", flexGrow: 1, flexBasis: 0, paddingTop: 1, paddingRight: 3, children: [
      /* @__PURE__ */ jsxs7(Text8, { bold: true, color: theme.primary, children: [
        "@",
        username.replace(/^@/, "")
      ] }),
      /* @__PURE__ */ jsx9(Gap2, {}),
      /* @__PURE__ */ jsx9(Text8, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u25B8 Choose platform" }),
      /* @__PURE__ */ jsx9(Gap2, {}),
      /* @__PURE__ */ jsx9(Text8, { color: theme.gray, dimColor: theme.dimSecondary, children: "Select target platform for this profile" })
    ] }),
    /* @__PURE__ */ jsx9(Panel, { title: "Platform", width: 38, children: /* @__PURE__ */ jsx9(
      SelectInput2,
      {
        indicatorComponent: ChoiceIndicator,
        itemComponent: ChoiceItem,
        items: items.map((item, index) => ({
          key: String(index),
          label: item.label,
          value: item.value
        })),
        onSelect: (item) => onSelect(item.value),
        onHighlight: (item) => onHighlight?.(item.value)
      }
    ) })
  ] });
}

// src/components/views/probing-view.tsx
import { Box as Box8, Text as Text9 } from "ink";
import { jsx as jsx10 } from "react/jsx-runtime";
function ProbingView({
  platformName,
  target,
  boxWidth,
  theme,
  buttonText
}) {
  const displayTarget = target.length > boxWidth - 8 ? `${target.slice(0, boxWidth - 9)}\u2026` : target;
  return /* @__PURE__ */ jsx10(Box8, { flexDirection: "column", alignItems: "center", children: /* @__PURE__ */ jsx10(FramedInput, { title: platformName || "Paste a profile link", width: boxWidth, button: buttonText, buttonDim: true, children: /* @__PURE__ */ jsx10(Text9, { color: theme.gray, dimColor: theme.dimSecondary, children: displayTarget }) }) });
}

// src/components/views/downloading-view.tsx
import { useState as useState5, useEffect as useEffect5 } from "react";
import os8 from "os";
import { Box as Box9, Text as Text11 } from "ink";
import Spinner from "ink-spinner";

// src/components/progress-bar.tsx
import React6 from "react";
import { Text as Text10 } from "ink";
import { jsx as jsx11, jsxs as jsxs8 } from "react/jsx-runtime";
function computeScannerTrack(tick, width = 30, blockWidth = 6) {
  const safeWidth = Math.max(1, width);
  const safeBlock = Math.min(safeWidth, Math.max(1, blockWidth));
  const maxPos = safeWidth - safeBlock;
  if (maxPos <= 0) {
    return { before: 0, active: safeWidth, after: 0 };
  }
  const cycle = 2 * maxPos;
  const phase = (tick % cycle + cycle) % cycle;
  const pos = phase <= maxPos ? phase : cycle - phase;
  return {
    before: pos,
    active: safeBlock,
    after: safeWidth - pos - safeBlock
  };
}
function getScannerSegments(tick, width = 30, blockWidth = 6) {
  const { before, active, after } = computeScannerTrack(tick, width, blockWidth);
  return {
    beforeStr: "\u2591".repeat(before),
    activeStr: "\u2588".repeat(active),
    afterStr: "\u2591".repeat(after)
  };
}
function ProgressBar({
  percent = 0,
  width = 30,
  showPercent = true,
  indeterminate = false,
  tick: externalTick
}) {
  const theme = useTheme();
  const [internalTick, setInternalTick] = React6.useState(0);
  React6.useEffect(() => {
    if (!indeterminate || externalTick !== void 0) return;
    const timer = setInterval(() => setInternalTick((t) => t + 1), 75);
    return () => clearInterval(timer);
  }, [indeterminate, externalTick]);
  if (indeterminate) {
    const currentTick = externalTick ?? internalTick;
    const { beforeStr, activeStr, afterStr } = getScannerSegments(currentTick, width);
    return /* @__PURE__ */ jsxs8(Text10, { children: [
      /* @__PURE__ */ jsx11(Text10, { color: theme.gray, dimColor: theme.dimSecondary, children: beforeStr }),
      /* @__PURE__ */ jsx11(Text10, { color: theme.primary, children: activeStr }),
      /* @__PURE__ */ jsx11(Text10, { color: theme.gray, dimColor: theme.dimSecondary, children: afterStr })
    ] });
  }
  const normalized = percent > 1 ? percent / 100 : Math.max(0, percent);
  const clamped = Math.min(1, normalized);
  const percentLabel = showPercent ? ` ${`${Math.round(clamped * 100)}%`.padStart(4)}` : "";
  const barWidth = Math.max(1, showPercent ? width - percentLabel.length : width);
  const filled = Math.round(clamped * barWidth);
  return /* @__PURE__ */ jsxs8(Text10, { children: [
    /* @__PURE__ */ jsx11(Text10, { color: theme.primary, children: "\u2588".repeat(filled) }),
    /* @__PURE__ */ jsx11(Text10, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u2591".repeat(barWidth - filled) }),
    percentLabel ? /* @__PURE__ */ jsx11(Text10, { color: theme.primary, children: percentLabel }) : null
  ] });
}

// src/components/views/downloading-view.tsx
import { jsx as jsx12, jsxs as jsxs9 } from "react/jsx-runtime";
function renderCarouselTrack(current, total) {
  const safeTotal = Math.max(1, Math.min(15, total));
  const safeCurrent = Math.max(1, Math.min(safeTotal, current));
  return Array.from({ length: safeTotal }, (_, i) => i < safeCurrent ? "\u25CF" : "\u25CB").join(" ");
}
function DownloadingView({
  profile,
  choice,
  progress,
  outputDir,
  writeMetadata,
  limit,
  since,
  theme,
  gapComponent: Gap2
}) {
  const [elapsed, setElapsed] = useState5(0);
  useEffect5(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1e3);
    return () => clearInterval(timer);
  }, []);
  const job = progress?.job || (choice ? `${choice.charAt(0).toUpperCase() + choice.slice(1)}` : "Initializing");
  const downloaded = progress?.downloadedCount ?? 0;
  const skipped = progress?.skippedCount ?? 0;
  const currentFile = progress?.currentFile ? truncate(progress.currentFile, 42) : "";
  const statusLine = progress?.statusText || (currentFile ? currentFile : "downloading\u2026");
  let slideInfo = null;
  const slideRegex = /(?:Slide|Album\s+slide|Part)\s+(\d+)\/(\d+)/i;
  const match = statusLine.match(slideRegex) || currentFile.match(slideRegex);
  if (match) {
    const cur = parseInt(match[1], 10);
    const tot = parseInt(match[2], 10);
    if (!isNaN(cur) && !isNaN(tot) && tot > 1) {
      slideInfo = { current: cur, total: tot };
    }
  }
  const activeBadges = [];
  if (writeMetadata) activeBadges.push("Sidecars: ON");
  if (limit) activeBadges.push(`Limit: ${limit}`);
  if (since) activeBadges.push(`Date: ${since}`);
  return /* @__PURE__ */ jsxs9(Box9, { flexDirection: "column", alignItems: "center", children: [
    /* @__PURE__ */ jsxs9(Text11, { color: theme.gray, dimColor: theme.dimSecondary, children: [
      "@",
      profile.username,
      " \xB7 ",
      job
    ] }),
    /* @__PURE__ */ jsx12(Gap2, {}),
    /* @__PURE__ */ jsx12(ProgressBar, { indeterminate: true, width: 30 }),
    /* @__PURE__ */ jsx12(Gap2, {}),
    /* @__PURE__ */ jsxs9(Text11, { children: [
      /* @__PURE__ */ jsx12(Text11, { color: theme.primary, children: /* @__PURE__ */ jsx12(Spinner, { type: "dots" }) }),
      /* @__PURE__ */ jsx12(Text11, { color: theme.gray, dimColor: theme.dimSecondary, children: ` ${statusLine}` })
    ] }),
    slideInfo ? /* @__PURE__ */ jsx12(Box9, { marginTop: 1, flexDirection: "column", alignItems: "center", children: /* @__PURE__ */ jsxs9(Text11, { color: theme.primary, bold: true, children: [
      "Album Slide [",
      renderCarouselTrack(slideInfo.current, slideInfo.total),
      "] ",
      slideInfo.current,
      "/",
      slideInfo.total
    ] }) }) : null,
    /* @__PURE__ */ jsx12(Gap2, {}),
    /* @__PURE__ */ jsx12(Text11, { color: theme.gray, dimColor: theme.dimSecondary, children: `${downloaded} downloaded  \xB7  ${skipped} archived  \xB7  ${formatDuration(elapsed)} elapsed` }),
    activeBadges.length > 0 ? /* @__PURE__ */ jsx12(Text11, { color: theme.gray, dimColor: theme.dimSecondary, children: activeBadges.join(" \xB7 ") }) : null,
    outputDir ? /* @__PURE__ */ jsxs9(Text11, { color: theme.gray, dimColor: theme.dimSecondary, children: [
      "saving to ",
      shortenPath(outputDir, os8.homedir(), 54)
    ] }) : null
  ] });
}

// src/components/views/completion-view.tsx
import os9 from "os";
import { Box as Box10, Text as Text12 } from "ink";
import { jsx as jsx13, jsxs as jsxs10 } from "react/jsx-runtime";
var DONE_LABEL = "\u21B5 download another";
var LEDGER_INDEXED_LABEL = "\u2713 indexed in media ledger";
function shouldShowLedgerBadge(result, showLedgerBadge) {
  return showLedgerBadge ?? result.downloadedCount > 0;
}
function formatCompletionSummary(result) {
  const isZero = result.downloadedCount === 0 && result.skippedCount === 0;
  const plural = result.downloadedCount === 1 ? "" : "s";
  const skipText = result.skippedCount > 0 ? ` (${result.skippedCount} archived)` : "";
  return {
    isZero,
    headerPrefix: isZero ? "\u2713 profile scanned " : "\u2713 profile downloaded! ",
    headerSuffix: isZero ? ": 0 media items found" : "saved to:",
    itemsText: isZero ? "no photos or videos available" : `${result.downloadedCount} media item${plural} downloaded${skipText}`
  };
}
function LedgerBadge({ theme }) {
  return /* @__PURE__ */ jsx13(Text12, { color: theme.gray, dimColor: theme.dimSecondary, children: LEDGER_INDEXED_LABEL });
}
function CompletionView({
  profile,
  result,
  theme,
  gapComponent: Gap2,
  showLedgerBadge
}) {
  const { headerPrefix, headerSuffix, itemsText } = formatCompletionSummary(result);
  const displayLedger = shouldShowLedgerBadge(result, showLedgerBadge);
  return /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", alignItems: "center", children: [
    /* @__PURE__ */ jsxs10(Text12, { children: [
      /* @__PURE__ */ jsx13(Text12, { bold: true, color: theme.primary, children: headerPrefix }),
      /* @__PURE__ */ jsx13(Text12, { color: theme.primary, children: headerSuffix })
    ] }),
    /* @__PURE__ */ jsx13(Text12, { color: theme.gray, dimColor: theme.dimSecondary, children: shortenPath(result.outputDir, os9.homedir(), 60) }),
    /* @__PURE__ */ jsx13(Text12, { color: theme.gray, dimColor: theme.dimSecondary, children: itemsText }),
    displayLedger && /* @__PURE__ */ jsx13(LedgerBadge, { theme }),
    /* @__PURE__ */ jsx13(Box10, { marginTop: 1, children: /* @__PURE__ */ jsxs10(Text12, { color: theme.gray, dimColor: theme.dimSecondary, children: [
      /* @__PURE__ */ jsx13(Text12, { bold: true, color: theme.primary, children: "[o]" }),
      " reveal in folder"
    ] }) }),
    /* @__PURE__ */ jsx13(Gap2, {}),
    /* @__PURE__ */ jsx13(
      Box10,
      {
        borderStyle: "round",
        borderColor: theme.gray,
        borderDimColor: theme.dimSecondary,
        borderBackgroundColor: theme.background,
        paddingX: 3,
        children: /* @__PURE__ */ jsx13(Text12, { bold: true, color: theme.primary, children: DONE_LABEL })
      }
    ),
    result.errors.length > 0 ? /* @__PURE__ */ jsx13(Box10, { flexDirection: "column", marginTop: 1, alignItems: "center", children: result.errors.slice(0, 3).map((err, i) => /* @__PURE__ */ jsxs10(Text12, { color: "red", dimColor: true, wrap: "wrap", children: [
      "\u2022 ",
      cleanInlineError(err)
    ] }, i)) }) : null
  ] });
}

// src/components/views/error-view.tsx
import { Box as Box11, Text as Text13 } from "ink";
import { jsx as jsx14, jsxs as jsxs11 } from "react/jsx-runtime";
function ErrorView({ message, hint, columns, theme }) {
  const width = Math.max(10, Math.min(columns - 6, 72));
  return /* @__PURE__ */ jsxs11(Box11, { flexDirection: "column", alignItems: "center", width, children: [
    /* @__PURE__ */ jsxs11(Text13, { bold: true, color: theme.primary, children: [
      "\u2717 ",
      message
    ] }),
    hint ? /* @__PURE__ */ jsx14(Box11, { marginTop: 1, children: /* @__PURE__ */ jsxs11(Text13, { color: theme.gray, dimColor: theme.dimSecondary, children: [
      "Hint: ",
      hint
    ] }) }) : null
  ] });
}

// src/components/views/settings-view.tsx
import { useState as useState6, useMemo as useMemo2, useCallback, useEffect as useEffect6 } from "react";
import { Box as Box12, Text as Text14, useInput as useInput2 } from "ink";
import fs15 from "fs";
import path15 from "path";
import os11 from "os";

// src/lib/diagnostics/doctor.ts
import { execFile } from "child_process";
import { promisify } from "util";
import os10 from "os";
import fs14 from "fs";
import path14 from "path";
var execFileAsync = promisify(execFile);
async function defaultCheckBinary(bin) {
  const versionFlag = bin === "ffmpeg" ? "-version" : "--version";
  try {
    await execFileAsync(bin, [versionFlag], { timeout: 3e3 });
    return true;
  } catch {
    if (bin === "gallery-dl" || bin === "yt-dlp") {
      try {
        const resolved = resolveEngineCommand(bin);
        await execFileAsync(resolved.command, [...resolved.baseArgs, versionFlag], { timeout: 3e3 });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
async function runDoctor(options = {}) {
  const check = options.binaryChecker ?? defaultCheckBinary;
  const [gdl, ytdlp, ffmpeg] = await Promise.all([
    check("gallery-dl"),
    check("yt-dlp"),
    check("ffmpeg")
  ]);
  const availableCookies = detectAvailableCookies(options.cookiesDir);
  const cookieStatus = {
    instagram: availableCookies.includes("instagram"),
    tiktok: availableCookies.includes("tiktok"),
    facebook: availableCookies.includes("facebook"),
    x: availableCookies.includes("x")
  };
  let storageOk = false;
  try {
    const testDir = options.storageDir || path14.join(os10.homedir(), ".open-nami");
    fs14.mkdirSync(testDir, { recursive: true });
    const testFile = path14.join(testDir, `.doctor_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs14.writeFileSync(testFile, "ok");
    fs14.unlinkSync(testFile);
    storageOk = true;
  } catch {
  }
  return {
    nodeVersion: process.version,
    binaries: {
      "gallery-dl": gdl,
      "yt-dlp": ytdlp,
      ffmpeg
    },
    cookies: cookieStatus,
    storageOk
  };
}

// src/components/views/settings-view.tsx
import { Fragment as Fragment2, jsx as jsx15, jsxs as jsxs12 } from "react/jsx-runtime";
function expandDir(dir) {
  if (dir.startsWith("~/") || dir.startsWith("~\\") || dir === "~") {
    return path15.join(os11.homedir(), dir.slice(1));
  }
  return dir;
}
function resolveBrowserOptions(detected) {
  const available = detected.filter((b) => b.available !== false);
  return ["auto", "none", ...available.map((b) => b.id)];
}
function formatBrowserFeedback(cookiesFromBrowser, detectedBrowsers = [], defaultBrowser) {
  if (cookiesFromBrowser === "auto") {
    if (defaultBrowser) {
      return `system default: ${defaultBrowser.name} (auto-extract session cookies)`;
    }
    return "system default: none detected (falls back to cookie files)";
  }
  if (!cookiesFromBrowser || cookiesFromBrowser === "none") {
    return "manual cookie files only";
  }
  const found = detectedBrowsers.find((b) => b.id === cookiesFromBrowser);
  const browserName = found ? found.name : cookiesFromBrowser;
  return `live session cookies from ${browserName}`;
}
function cycleBrowserOption(current, options, forward = true) {
  if (options.length === 0) return "auto";
  const idx = options.indexOf(current);
  const currentIndex = idx === -1 ? 0 : idx;
  const nextIdx = forward ? (currentIndex + 1) % options.length : (currentIndex - 1 + options.length) % options.length;
  return options[nextIdx];
}
function formatDoctorStorage(storageOk) {
  return {
    ok: storageOk,
    text: storageOk ? "\u2713 SQLite ready" : "\u2717 SQLite unavailable"
  };
}
function formatDoctorCookies(cookies) {
  const platforms = Object.entries(cookies).filter(([_, ok]) => ok).map(([name]) => name);
  const count = platforms.length;
  const text = count > 0 ? `\u2713 ${count} (${platforms.join(", ")})` : "none detected";
  return { count, platforms, text };
}
function DoctorCard({ boxWidth, theme, report }) {
  const cookieSummary = report ? formatDoctorCookies(report.cookies) : { count: 0, platforms: [], text: "" };
  const storageSummary = report ? formatDoctorStorage(report.storageOk) : { ok: false, text: "" };
  return /* @__PURE__ */ jsxs12(
    Box12,
    {
      width: boxWidth,
      borderStyle: "round",
      borderColor: theme.gray,
      borderDimColor: theme.dimSecondary,
      paddingX: 2,
      flexDirection: "column",
      children: [
        /* @__PURE__ */ jsxs12(Box12, { justifyContent: "space-between", children: [
          /* @__PURE__ */ jsx15(Text14, { color: theme.primary, bold: true, children: "System Diagnostics" }),
          /* @__PURE__ */ jsx15(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: report ? report.nodeVersion : "checking\u2026" })
        ] }),
        report ? /* @__PURE__ */ jsxs12(Fragment2, { children: [
          /* @__PURE__ */ jsxs12(Box12, { marginTop: 0, children: [
            /* @__PURE__ */ jsxs12(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: [
              "Engines:",
              " "
            ] }),
            /* @__PURE__ */ jsxs12(
              Text14,
              {
                color: report.binaries["gallery-dl"] ? "green" : "red",
                dimColor: !report.binaries["gallery-dl"] && theme.dimSecondary,
                children: [
                  report.binaries["gallery-dl"] ? "\u2713" : "\u2717",
                  " gallery-dl"
                ]
              }
            ),
            /* @__PURE__ */ jsxs12(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: [
              " ",
              "\xB7",
              " "
            ] }),
            /* @__PURE__ */ jsxs12(
              Text14,
              {
                color: report.binaries["yt-dlp"] ? "green" : "red",
                dimColor: !report.binaries["yt-dlp"] && theme.dimSecondary,
                children: [
                  report.binaries["yt-dlp"] ? "\u2713" : "\u2717",
                  " yt-dlp"
                ]
              }
            ),
            /* @__PURE__ */ jsxs12(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: [
              " ",
              "\xB7",
              " "
            ] }),
            /* @__PURE__ */ jsxs12(
              Text14,
              {
                color: report.binaries.ffmpeg ? "green" : "red",
                dimColor: !report.binaries.ffmpeg && theme.dimSecondary,
                children: [
                  report.binaries.ffmpeg ? "\u2713" : "\u2717",
                  " ffmpeg"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs12(Box12, { justifyContent: "space-between", marginTop: 0, children: [
            /* @__PURE__ */ jsxs12(Box12, { children: [
              /* @__PURE__ */ jsxs12(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: [
                "Storage:",
                " "
              ] }),
              /* @__PURE__ */ jsx15(
                Text14,
                {
                  color: storageSummary.ok ? "green" : "red",
                  dimColor: !storageSummary.ok && theme.dimSecondary,
                  children: storageSummary.text
                }
              )
            ] }),
            /* @__PURE__ */ jsxs12(Box12, { children: [
              /* @__PURE__ */ jsxs12(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: [
                "Cookies:",
                " "
              ] }),
              /* @__PURE__ */ jsx15(
                Text14,
                {
                  color: cookieSummary.count > 0 ? theme.primary : theme.gray,
                  dimColor: cookieSummary.count === 0 && theme.dimSecondary,
                  children: cookieSummary.text
                }
              )
            ] })
          ] })
        ] }) : /* @__PURE__ */ jsx15(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: "checking system engines and storage\u2026" })
      ]
    }
  );
}
var LIMIT_OPTIONS = [void 0, 10, 25, 50, 100];
function SettingsView({
  boxWidth,
  theme,
  gapComponent: Gap2,
  focusedField: controlledFocus,
  onFocusChange,
  onSave,
  onCancel,
  doctorChecker,
  initialReport,
  browsers: browsersProp,
  defaultBrowser: defaultBrowserProp,
  initialConfig: initialConfigProp
}) {
  const initialConfig = useMemo2(() => initialConfigProp ?? loadConfig(), [initialConfigProp]);
  const [internalFocus, setInternalFocus] = useState6("cookies");
  const focusedField = controlledFocus ?? internalFocus;
  const setField = useCallback(
    (field) => {
      setInternalFocus(field);
      onFocusChange?.(field);
    },
    [onFocusChange]
  );
  const defaultBrowser = useMemo2(() => {
    return defaultBrowserProp !== void 0 ? defaultBrowserProp : detectSystemDefaultBrowser();
  }, [defaultBrowserProp]);
  const detectedBrowsers = useMemo2(() => {
    return browsersProp ?? listDetectedBrowsers();
  }, [browsersProp]);
  const browserOptions = useMemo2(() => {
    return resolveBrowserOptions(detectedBrowsers);
  }, [detectedBrowsers]);
  const [cookiesDir, setCookiesDir] = useState6(initialConfig.cookiesDir ?? "");
  const [cookiesFromBrowser, setCookiesFromBrowser] = useState6(
    initialConfig.cookiesFromBrowser ?? "auto"
  );
  const [downloadDir, setDownloadDir] = useState6(initialConfig.downloadDir ?? "");
  const [writeMetadata, setWriteMetadata] = useState6(Boolean(initialConfig.writeMetadata));
  const [defaultLimit, setDefaultLimit] = useState6(initialConfig.defaultLimit);
  const [saved, setSaved] = useState6(false);
  const [doctorReport, setDoctorReport] = useState6(initialReport ?? null);
  useEffect6(() => {
    let cancelled = false;
    const fetchReport = async () => {
      try {
        const options = {
          cookiesDir: cookiesDir.trim() ? expandDir(cookiesDir.trim()) : void 0
        };
        let report;
        if (doctorChecker) {
          const res = await doctorChecker(options);
          if (res && typeof res === "object" && "binaries" in res) {
            report = res;
          } else {
            report = await runDoctor({
              ...options,
              binaryChecker: doctorChecker
            });
          }
        } else {
          report = await runDoctor(options);
        }
        if (!cancelled) {
          setDoctorReport(report);
        }
      } catch {
      }
    };
    if (initialReport === void 0 || doctorChecker !== void 0) {
      fetchReport();
    }
    return () => {
      cancelled = true;
    };
  }, [cookiesDir, doctorChecker, initialReport]);
  const handleSave = useCallback(() => {
    const existing = loadConfig();
    const nextConfig = {
      ...existing,
      cookiesDir: cookiesDir.trim() ? cookiesDir.trim() : void 0,
      cookiesFromBrowser,
      downloadDir: downloadDir.trim() ? downloadDir.trim() : void 0,
      writeMetadata,
      defaultLimit
    };
    saveConfig(nextConfig);
    setSaved(true);
    onSave();
  }, [cookiesDir, cookiesFromBrowser, downloadDir, writeMetadata, defaultLimit, onSave]);
  const browserFeedback = useMemo2(() => {
    return formatBrowserFeedback(cookiesFromBrowser, detectedBrowsers, defaultBrowser);
  }, [cookiesFromBrowser, detectedBrowsers, defaultBrowser]);
  const cookieFeedback = useMemo2(() => {
    const dir = cookiesDir.trim();
    if (!dir) {
      const defaultCookies = detectAvailableCookies();
      return {
        ok: defaultCookies.length > 0,
        text: defaultCookies.length > 0 ? `default paths \xB7 ${defaultCookies.length} cookie(s) found (${defaultCookies.join(", ")})` : "default paths \xB7 no recognized cookies found"
      };
    }
    const expanded = expandDir(dir);
    if (!fs15.existsSync(expanded)) {
      return {
        ok: false,
        text: "directory does not exist yet"
      };
    }
    const detected = detectAvailableCookies(expanded);
    if (detected.length === 0) {
      return {
        ok: false,
        text: "no recognized cookie files found in this directory"
      };
    }
    return {
      ok: true,
      text: `\u2713 ${detected.length} cookie(s) found (${detected.join(", ")})`
    };
  }, [cookiesDir]);
  const downloadFeedback = useMemo2(() => {
    const dir = downloadDir.trim();
    if (!dir) {
      return "default: platform Downloads / Open Nami";
    }
    return `target: ${path15.resolve(expandDir(dir))}`;
  }, [downloadDir]);
  const cycleFocus = useCallback((forward = true) => {
    const fields = ["cookies", "browser", "download", "metadata", "limit"];
    const idx = fields.indexOf(focusedField);
    const nextIdx = forward ? (idx + 1) % fields.length : (idx - 1 + fields.length) % fields.length;
    setField(fields[nextIdx]);
  }, [focusedField, setField]);
  const cycleBrowser = useCallback((forward = true) => {
    setCookiesFromBrowser((prev) => {
      const next = cycleBrowserOption(prev ?? "auto", browserOptions, forward);
      return next;
    });
  }, [browserOptions]);
  const cycleLimit = useCallback(() => {
    setDefaultLimit((prev) => {
      const idx = LIMIT_OPTIONS.indexOf(prev);
      const nextIdx = (idx + 1) % LIMIT_OPTIONS.length;
      return LIMIT_OPTIONS[nextIdx];
    });
  }, []);
  useInput2((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.ctrl && (input === "s" || input === "S")) {
      handleSave();
      return;
    }
    if (focusedField === "browser") {
      if (input === " " || key.return) {
        cycleBrowser(true);
        return;
      }
      if (key.tab || key.downArrow) {
        cycleFocus(true);
        return;
      }
      if (key.upArrow) {
        cycleFocus(false);
        return;
      }
    }
    if (focusedField === "metadata") {
      if (input === " " || key.return) {
        setWriteMetadata((prev) => !prev);
        return;
      }
      if (key.tab || key.downArrow) {
        cycleFocus(true);
        return;
      }
      if (key.upArrow) {
        cycleFocus(false);
        return;
      }
    }
    if (focusedField === "limit") {
      if (input === " " || key.return) {
        cycleLimit();
        return;
      }
      if (key.tab || key.downArrow) {
        cycleFocus(true);
        return;
      }
      if (key.upArrow) {
        cycleFocus(false);
        return;
      }
    }
  }, { isActive: Boolean(process.stdin.isTTY) });
  return /* @__PURE__ */ jsxs12(Box12, { flexDirection: "column", alignItems: "center", children: [
    /* @__PURE__ */ jsx15(
      FramedInput,
      {
        title: focusedField === "cookies" ? "\u25CF Cookies Folder" : "\u25CB Cookies Folder",
        width: boxWidth,
        children: /* @__PURE__ */ jsx15(
          TextInput,
          {
            value: cookiesDir,
            onChange: setCookiesDir,
            onSubmit: () => setField("browser"),
            focus: focusedField === "cookies",
            onTab: () => cycleFocus(true),
            onArrowDown: () => cycleFocus(true),
            onArrowUp: () => cycleFocus(false),
            placeholder: "e.g. F:\\Nami\\cookies or ./cookies",
            width: boxWidth - 6
          }
        )
      }
    ),
    /* @__PURE__ */ jsx15(Text14, { color: cookieFeedback.ok ? theme.primary : theme.gray, dimColor: !cookieFeedback.ok && theme.dimSecondary, children: cookieFeedback.text }),
    /* @__PURE__ */ jsx15(Gap2, {}),
    /* @__PURE__ */ jsxs12(
      Box12,
      {
        width: boxWidth,
        borderStyle: "round",
        borderColor: focusedField === "browser" ? theme.primary : theme.gray,
        borderDimColor: focusedField !== "browser",
        paddingX: 2,
        justifyContent: "space-between",
        children: [
          /* @__PURE__ */ jsxs12(Text14, { color: focusedField === "browser" ? theme.primary : theme.gray, bold: focusedField === "browser", children: [
            focusedField === "browser" ? "\u25CF " : "\u25CB ",
            "Browser Cookie Bridge"
          ] }),
          /* @__PURE__ */ jsx15(Text14, { color: cookiesFromBrowser && cookiesFromBrowser !== "none" ? theme.primary : theme.gray, bold: true, children: `[${(cookiesFromBrowser ?? "auto").toUpperCase()}]` })
        ]
      }
    ),
    /* @__PURE__ */ jsx15(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: browserFeedback }),
    /* @__PURE__ */ jsx15(Gap2, {}),
    /* @__PURE__ */ jsx15(
      FramedInput,
      {
        title: focusedField === "download" ? "\u25CF Download Directory" : "\u25CB Download Directory",
        width: boxWidth,
        children: /* @__PURE__ */ jsx15(
          TextInput,
          {
            value: downloadDir,
            onChange: setDownloadDir,
            onSubmit: () => setField("metadata"),
            focus: focusedField === "download",
            onTab: () => cycleFocus(true),
            onArrowDown: () => cycleFocus(true),
            onArrowUp: () => cycleFocus(false),
            placeholder: "e.g. D:\\Downloads\\Open Nami",
            width: boxWidth - 6
          }
        )
      }
    ),
    /* @__PURE__ */ jsx15(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: downloadFeedback }),
    /* @__PURE__ */ jsx15(Gap2, {}),
    /* @__PURE__ */ jsxs12(
      Box12,
      {
        width: boxWidth,
        borderStyle: "round",
        borderColor: focusedField === "metadata" ? theme.primary : theme.gray,
        borderDimColor: focusedField !== "metadata",
        paddingX: 2,
        justifyContent: "space-between",
        children: [
          /* @__PURE__ */ jsxs12(Text14, { color: focusedField === "metadata" ? theme.primary : theme.gray, bold: focusedField === "metadata", children: [
            focusedField === "metadata" ? "\u25CF " : "\u25CB ",
            "Write Captions & Metadata Sidecars (.json)"
          ] }),
          /* @__PURE__ */ jsx15(Text14, { color: writeMetadata ? theme.primary : theme.gray, bold: true, children: writeMetadata ? "[ENABLED]" : "[DISABLED]" })
        ]
      }
    ),
    /* @__PURE__ */ jsx15(Gap2, {}),
    /* @__PURE__ */ jsxs12(
      Box12,
      {
        width: boxWidth,
        borderStyle: "round",
        borderColor: focusedField === "limit" ? theme.primary : theme.gray,
        borderDimColor: focusedField !== "limit",
        paddingX: 2,
        justifyContent: "space-between",
        children: [
          /* @__PURE__ */ jsxs12(Text14, { color: focusedField === "limit" ? theme.primary : theme.gray, bold: focusedField === "limit", children: [
            focusedField === "limit" ? "\u25CF " : "\u25CB ",
            "Default Post Limit"
          ] }),
          /* @__PURE__ */ jsx15(Text14, { color: theme.primary, bold: true, children: defaultLimit ? `[${defaultLimit} posts]` : "[ALL]" })
        ]
      }
    ),
    /* @__PURE__ */ jsx15(Gap2, {}),
    /* @__PURE__ */ jsx15(DoctorCard, { boxWidth, theme, report: doctorReport }),
    /* @__PURE__ */ jsx15(Gap2, {}),
    /* @__PURE__ */ jsx15(Text14, { color: theme.gray, dimColor: theme.dimSecondary, children: saved ? "\u2713 preferences saved to ~/.open-nami/config.json" : "tab / \u2191\u2193 switch field \xB7 space toggle/cycle \xB7 ^s / \u21B5 save \xB7 esc back" })
  ] });
}

// src/components/views/watcher-view.tsx
import { useState as useState7, useEffect as useEffect7, useRef as useRef3, useCallback as useCallback2 } from "react";
import { Box as Box13, Text as Text15, useInput as useInput3 } from "ink";
import Spinner2 from "ink-spinner";

// src/lib/clipboard.ts
import { execFileSync as execFileSync2 } from "child_process";
var COMMANDS = process.platform === "darwin" ? [["pbpaste", []]] : process.platform === "win32" ? [["powershell", ["-NoProfile", "-Command", "Get-Clipboard"]]] : [
  ["wl-paste", ["--no-newline"]],
  ["xclip", ["-selection", "clipboard", "-o"]],
  ["xsel", ["--clipboard", "--output"]]
];
function readClipboard(execFn = execFileSync2) {
  for (const [command, args] of COMMANDS) {
    try {
      const out = execFn(command, args, { encoding: "utf8", timeout: 1500, stdio: ["ignore", "pipe", "ignore"] });
      if (out && typeof out === "string") {
        return out.trim();
      }
    } catch {
    }
  }
  return "";
}

// src/lib/parser.ts
var INVALID_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1f]/g;
var WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
function sanitizeUsername(username) {
  let cleaned = username.replace(INVALID_CHARS_REGEX, "_").trim().replace(/^[.\s]+|[.\s]+$/g, "");
  if (WINDOWS_RESERVED_NAMES.test(cleaned)) {
    cleaned = `_${cleaned}`;
  }
  return cleaned.slice(0, 120) || "unknown";
}
function buildProfileUrl(platform, username) {
  const cleanUser = username.trim().replace(/^@/, "").replace(/^[.\s]+|[.\s]+$/g, "");
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${cleanUser}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${cleanUser}`;
    case "facebook":
      return `https://www.facebook.com/${cleanUser}`;
    case "x":
      return `https://x.com/${cleanUser}`;
  }
}
function buildCanonicalProfile(platform, username, rawInput) {
  const cleanUser = username.trim().replace(/^@/, "").replace(/^[.\s]+|[.\s]+$/g, "");
  return {
    platform,
    username: sanitizeUsername(cleanUser),
    cleanUrl: buildProfileUrl(platform, cleanUser),
    rawInput: rawInput ?? cleanUser
  };
}
function isBareUsername(input) {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed) || /[\/\\:\s]/.test(trimmed)) return false;
  const user = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (!user) return false;
  if (!/^[a-zA-Z0-9._-]+$/.test(user)) return false;
  if (!/[a-zA-Z0-9]/.test(user)) return false;
  const cleaned = user.replace(/^[.\s]+|[.\s]+$/g, "");
  return cleaned.length > 0 && /[a-zA-Z0-9]/.test(cleaned);
}
function parseProfileInput(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return { platform: "unknown", username: "", cleanUrl: "", rawInput: input };
  }
  const prefixMatch = trimmed.match(/^(ig|instagram|tt|tiktok|fb|facebook|x|twitter):([^\s/]+)$/i);
  if (prefixMatch) {
    const rawPrefix = prefixMatch[1].toLowerCase();
    const rawUser = prefixMatch[2];
    if (rawPrefix === "ig" || rawPrefix === "instagram") {
      return buildCanonicalProfile("instagram", rawUser, input);
    } else if (rawPrefix === "tt" || rawPrefix === "tiktok") {
      return buildCanonicalProfile("tiktok", rawUser, input);
    } else if (rawPrefix === "fb" || rawPrefix === "facebook") {
      return buildCanonicalProfile("facebook", rawUser, input);
    } else if (rawPrefix === "x" || rawPrefix === "twitter") {
      return buildCanonicalProfile("x", rawUser, input);
    }
  }
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (candidate.includes("instagram.com") || candidate.includes("tiktok.com") || candidate.includes("facebook.com") || candidate.includes("x.com") || candidate.includes("twitter.com")) {
      candidate = "https://" + candidate;
    }
  }
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    const pathname = url.pathname.replace(/\/+$/, "");
    const pathParts = pathname.split("/").filter(Boolean);
    if (host.includes("tiktok.com")) {
      const userPart = pathParts[0] || "";
      const username = userPart.startsWith("@") ? userPart.slice(1) : userPart;
      if (username) {
        return {
          platform: "tiktok",
          username: sanitizeUsername(username),
          cleanUrl: `https://www.tiktok.com/@${username}`,
          rawInput: input
        };
      }
    }
    if (host.includes("instagram.com")) {
      const firstPart = pathParts[0] || "";
      const reserved = ["p", "reel", "reels", "tv", "stories", "explore", "direct", "accounts"];
      if (firstPart && !reserved.includes(firstPart.toLowerCase())) {
        const username = firstPart.replace(/^@/, "");
        return {
          platform: "instagram",
          username: sanitizeUsername(username),
          cleanUrl: `https://www.instagram.com/${username}/`,
          rawInput: input
        };
      }
    }
    if (host.includes("facebook.com") || host === "fb.com") {
      if (pathParts[0]?.toLowerCase() === "profile.php") {
        const id = url.searchParams.get("id");
        if (id) {
          return {
            platform: "facebook",
            username: sanitizeUsername(id),
            cleanUrl: `https://www.facebook.com/profile.php?id=${id}`,
            rawInput: input
          };
        }
      } else if (pathParts[0]?.toLowerCase() === "people" && pathParts[1]) {
        return {
          platform: "facebook",
          username: sanitizeUsername(pathParts[1]),
          cleanUrl: `https://www.facebook.com/people/${pathParts[1]}`,
          rawInput: input
        };
      } else if (pathParts[0]) {
        const reserved = ["watch", "videos", "reel", "groups", "pages", "events", "photo"];
        if (!reserved.includes(pathParts[0].toLowerCase())) {
          return {
            platform: "facebook",
            username: sanitizeUsername(pathParts[0]),
            cleanUrl: `https://www.facebook.com/${pathParts[0]}`,
            rawInput: input
          };
        }
      }
    }
    if (host.includes("x.com") || host.includes("twitter.com")) {
      if (pathParts[0]?.toLowerCase() === "i" && pathParts[1]?.toLowerCase() === "history" && pathParts[2]?.toLowerCase() === "likes") {
        return {
          platform: "x",
          username: "i_history_likes",
          cleanUrl: "https://x.com/i/history/likes",
          rawInput: input
        };
      }
      if (pathParts[0]?.toLowerCase() === "i" && pathParts[1]?.toLowerCase() === "bookmarks") {
        return {
          platform: "x",
          username: "i_bookmarks",
          cleanUrl: "https://x.com/i/bookmarks",
          rawInput: input
        };
      }
      const firstPart = pathParts[0] || "";
      const reserved = ["home", "explore", "notifications", "messages", "i", "settings"];
      if (firstPart && !reserved.includes(firstPart.toLowerCase())) {
        const username = firstPart.replace(/^@/, "");
        const isLikesUrl = pathParts[1]?.toLowerCase() === "likes";
        return {
          platform: "x",
          username: sanitizeUsername(username),
          cleanUrl: isLikesUrl ? `https://x.com/${username}/likes` : `https://x.com/${username}`,
          rawInput: input
        };
      }
    }
  } catch {
  }
  if (isBareUsername(trimmed)) {
    const rawUser = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
    const user = rawUser.replace(/^[.\s]+|[.\s]+$/g, "");
    return {
      platform: "unknown",
      username: user,
      cleanUrl: "",
      rawInput: input
    };
  }
  return {
    platform: "unknown",
    username: "",
    cleanUrl: "",
    rawInput: input
  };
}

// src/lib/watcher.ts
function startClipboardWatcher(options = {}) {
  const choice = options.choice || "all";
  const intervalMs = options.intervalMs ?? 1e3;
  const readClip = options.readClipboardFn ?? readClipboard;
  const dispatch = options.dispatchFn ?? dispatchDownload;
  let isRunning = true;
  let lastClipboardText = "";
  const processedUrls = /* @__PURE__ */ new Set();
  let timer = null;
  let resolvePromise = null;
  const stop = () => {
    if (!isRunning && !timer && !resolvePromise) return;
    isRunning = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (resolvePromise) {
      const resolve = resolvePromise;
      resolvePromise = null;
      resolve();
    }
  };
  if (options.signal) {
    if (options.signal.aborted) {
      isRunning = false;
    } else {
      options.signal.addEventListener("abort", stop, { once: true });
    }
  }
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
    if (!isRunning || options.signal?.aborted) {
      resolvePromise = null;
      resolve();
      return;
    }
    const loop = async () => {
      if (!isRunning || options.signal?.aborted) {
        stop();
        return;
      }
      try {
        const text = readClip().trim();
        if (text && text !== lastClipboardText) {
          lastClipboardText = text;
          const parsed = parseProfileInput(text);
          if (parsed.platform !== "unknown" && parsed.cleanUrl && !processedUrls.has(parsed.cleanUrl)) {
            processedUrls.add(parsed.cleanUrl);
            options.onDetected?.(parsed);
            try {
              const res = await dispatch({
                profile: parsed,
                choice: options.getChoice ? options.getChoice() : options.choice || "all",
                outputDir: resolveDefaultDownloadDir(parsed.platform, parsed.username, options.outputDir),
                writeMetadata: options.getWriteMetadata ? options.getWriteMetadata() : options.writeMetadata ?? false,
                signal: options.signal,
                onProgress: (p) => {
                  if (p.statusText) {
                    options.onProgress?.(parsed, p.statusText);
                  }
                }
              });
              options.onComplete?.(parsed, res);
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              options.onError?.(parsed, error);
            }
          }
        }
      } catch {
      }
      if (isRunning && !options.signal?.aborted) {
        timer = setTimeout(loop, intervalMs);
      } else {
        stop();
      }
    };
    loop();
  });
  return { stop, promise };
}

// src/lib/reveal.ts
import fs16 from "fs";
import { spawn as spawn4 } from "child_process";
import path16 from "path";
function buildOpenBrowserCommand(url, platform = process.platform) {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }
  if (platform === "darwin") {
    return { command: "open", args: [url] };
  }
  if (platform === "win32") {
    return { command: "rundll32.exe", args: ["url.dll,FileProtocolHandler", url] };
  }
  return { command: "xdg-open", args: [url] };
}
function openBrowser(url) {
  try {
    const spec = buildOpenBrowserCommand(url);
    if (!spec) return;
    spawn4(spec.command, spec.args, { detached: true, stdio: "ignore" }).unref();
  } catch {
  }
}
function getRevealCommand(targetPath, platform = process.platform, isDirectory) {
  const pathModule = platform === "win32" ? path16.win32 : platform === "darwin" ? path16.posix : path16;
  const resolved = pathModule.resolve(targetPath);
  const isDir = isDirectory !== void 0 ? isDirectory : (() => {
    try {
      if (fs16.existsSync(resolved)) {
        return fs16.statSync(resolved).isDirectory();
      }
    } catch {
    }
    return !pathModule.extname(resolved);
  })();
  if (platform === "darwin") {
    return isDir ? { command: "open", args: [resolved] } : { command: "open", args: ["-R", resolved] };
  }
  if (platform === "win32") {
    if (isDir) {
      return { command: "explorer.exe", args: [resolved] };
    }
    return { command: "explorer.exe", args: [`/select,${resolved}`] };
  }
  return { command: "xdg-open", args: [isDir ? resolved : pathModule.dirname(resolved)] };
}
function revealInFileManager(targetPath) {
  try {
    const { command, args } = getRevealCommand(targetPath);
    spawn4(command, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
  }
}

// src/components/views/watcher-view.tsx
import { jsx as jsx16, jsxs as jsxs13 } from "react/jsx-runtime";
var CHOICES = ["all", "photos", "videos", "stories", "highlights"];
function WatcherView({
  onBack,
  outputDir,
  theme,
  gapComponent: Gap2,
  defaultChoice = "all",
  defaultWriteMetadata = false,
  onRegisterClickTargets
}) {
  const [mediaChoice, setMediaChoice] = useState7(defaultChoice);
  const [writeMetadata, setWriteMetadata] = useState7(defaultWriteMetadata);
  const [focusedIndex, setFocusedIndex] = useState7(0);
  const [history, setHistory] = useState7([]);
  const [activeJob, setActiveJob] = useState7(null);
  const [stats, setStats] = useState7({ detected: 0, downloaded: 0, skipped: 0 });
  const [pulseTick, setPulseTick] = useState7(0);
  const mediaChoiceRef = useRef3(mediaChoice);
  mediaChoiceRef.current = mediaChoice;
  const writeMetadataRef = useRef3(writeMetadata);
  writeMetadataRef.current = writeMetadata;
  useEffect7(() => {
    const pulseTimer = setInterval(() => {
      setPulseTick((t) => t + 1);
    }, 120);
    return () => clearInterval(pulseTimer);
  }, []);
  useEffect7(() => {
    const watcher = startClipboardWatcher({
      choice: mediaChoiceRef.current,
      getChoice: () => mediaChoiceRef.current,
      outputDir,
      writeMetadata: writeMetadataRef.current,
      getWriteMetadata: () => writeMetadataRef.current,
      onDetected: (profile) => {
        setStats((prev) => ({ ...prev, detected: prev.detected + 1 }));
        const newItem = {
          profile,
          status: "downloading",
          statusText: "starting download\u2026"
        };
        setActiveJob(newItem);
        setHistory((prev) => [newItem, ...prev.slice(0, 4)]);
      },
      onProgress: (profile, statusText) => {
        setActiveJob((prev) => {
          if (!prev || prev.profile.cleanUrl !== profile.cleanUrl) return prev;
          return { ...prev, statusText };
        });
      },
      onComplete: (profile, result) => {
        setStats((prev) => ({
          ...prev,
          downloaded: prev.downloaded + result.downloadedCount,
          skipped: prev.skipped + result.skippedCount
        }));
        const completedItem = {
          profile,
          status: result.success ? "completed" : "failed",
          statusText: result.success ? `${result.downloadedCount} downloaded, ${result.skippedCount} skipped` : result.errors[0] || "failed",
          downloaded: result.downloadedCount,
          skipped: result.skippedCount
        };
        setActiveJob(null);
        setHistory((prev) => [
          completedItem,
          ...prev.filter((item) => item.profile.cleanUrl !== profile.cleanUrl).slice(0, 4)
        ]);
      },
      onError: (profile, err) => {
        const failedItem = {
          profile,
          status: "failed",
          statusText: err.message,
          error: err.message
        };
        setActiveJob(null);
        setHistory((prev) => [
          failedItem,
          ...prev.filter((item) => item.profile.cleanUrl !== profile.cleanUrl).slice(0, 4)
        ]);
      }
    });
    return () => {
      watcher.stop();
    };
  }, [outputDir]);
  const cycleChoice = useCallback2(() => {
    setMediaChoice((prev) => {
      const idx = CHOICES.indexOf(prev);
      const nextChoice = CHOICES[(idx + 1) % CHOICES.length] || "all";
      return nextChoice;
    });
  }, []);
  const toggleMetadata = useCallback2(() => {
    setWriteMetadata((prev) => !prev);
  }, []);
  const openFolder = useCallback2(() => {
    const target = outputDir || resolveDefaultDownloadDir("instagram", "watcher");
    revealInFileManager(target);
  }, [outputDir]);
  useEffect7(() => {
    if (!onRegisterClickTargets) return;
    const targets = [
      { match: "Target:", padX: 1, action: () => {
        setFocusedIndex(0);
        cycleChoice();
      } },
      { match: "Sidecars:", padX: 1, action: () => {
        setFocusedIndex(1);
        toggleMetadata();
      } },
      { match: "Open Folder", padX: 1, action: () => {
        setFocusedIndex(2);
        openFolder();
      } },
      { match: "c target", padX: 1, action: () => {
        setFocusedIndex(0);
        cycleChoice();
      } },
      { match: "m sidecar", padX: 1, action: () => {
        setFocusedIndex(1);
        toggleMetadata();
      } },
      { match: "o open dir", padX: 1, action: () => {
        setFocusedIndex(2);
        openFolder();
      } },
      { match: "esc back", padX: 1, action: onBack }
    ];
    onRegisterClickTargets(targets);
  }, [onRegisterClickTargets, cycleChoice, toggleMetadata, openFolder, onBack, mediaChoice, writeMetadata]);
  useInput3((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.leftArrow) {
      setFocusedIndex((prev) => prev === 0 ? 2 : prev - 1);
      return;
    }
    if (key.rightArrow || key.tab) {
      setFocusedIndex((prev) => prev === 2 ? 0 : prev + 1);
      return;
    }
    if (key.return || input === " ") {
      if (focusedIndex === 0) cycleChoice();
      else if (focusedIndex === 1) toggleMetadata();
      else if (focusedIndex === 2) openFolder();
      return;
    }
    if (input === "c" || input === "C") {
      setFocusedIndex(0);
      cycleChoice();
      return;
    }
    if (input === "m" || input === "M") {
      setFocusedIndex(1);
      toggleMetadata();
      return;
    }
    if (input === "o" || input === "O") {
      setFocusedIndex(2);
      openFolder();
      return;
    }
  }, { isActive: Boolean(process.stdin.isTTY) });
  const radarIcon = ["\u25CE", "\u25C9", "\u25CB", "\u25CF"][pulseTick % 4];
  return /* @__PURE__ */ jsx16(Box13, { flexDirection: "column", alignItems: "center", children: /* @__PURE__ */ jsx16(Panel, { title: "Clipboard Watcher Radar", width: 64, children: /* @__PURE__ */ jsxs13(Box13, { flexDirection: "column", paddingY: 1, children: [
    /* @__PURE__ */ jsxs13(Box13, { justifyContent: "space-between", marginBottom: 1, children: [
      /* @__PURE__ */ jsxs13(Text15, { color: theme.primary, bold: true, children: [
        radarIcon,
        " RADAR ACTIVE"
      ] }),
      /* @__PURE__ */ jsx16(Text15, { color: theme.gray, dimColor: theme.dimSecondary, children: "interval: 1.0s \xB7 auto-download" })
    ] }),
    /* @__PURE__ */ jsx16(ProgressBar, { indeterminate: true, width: 58, tick: pulseTick }),
    /* @__PURE__ */ jsx16(Gap2, {}),
    /* @__PURE__ */ jsxs13(Box13, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx16(Text15, { color: theme.gray, dimColor: theme.dimSecondary, children: "Auto-monitoring clipboard for profile links (Instagram, TikTok, FB, X)." }),
      /* @__PURE__ */ jsx16(Text15, { color: theme.gray, dimColor: theme.dimSecondary, children: "Copy any profile link in your browser: Open Nami downloads it in background." })
    ] }),
    /* @__PURE__ */ jsx16(Gap2, {}),
    /* @__PURE__ */ jsx16(
      Box13,
      {
        borderStyle: "round",
        borderColor: activeJob ? theme.primary : theme.gray,
        borderDimColor: !activeJob,
        flexDirection: "column",
        paddingX: 1,
        paddingY: 1,
        children: activeJob ? /* @__PURE__ */ jsxs13(Box13, { flexDirection: "column", children: [
          /* @__PURE__ */ jsxs13(Box13, { children: [
            /* @__PURE__ */ jsx16(Text15, { color: theme.primary, children: /* @__PURE__ */ jsx16(Spinner2, { type: "dots" }) }),
            /* @__PURE__ */ jsx16(Text15, { bold: true, color: theme.primary, children: ` Downloading @${activeJob.profile.username} (${activeJob.profile.platform})` })
          ] }),
          /* @__PURE__ */ jsx16(Text15, { color: theme.gray, dimColor: theme.dimSecondary, children: `Status: ${activeJob.statusText || "downloading\u2026"}` })
        ] }) : /* @__PURE__ */ jsx16(Text15, { color: theme.gray, dimColor: theme.dimSecondary, children: "Waiting for copied profile links\u2026 (radar scanning)" })
      }
    ),
    history.length > 0 ? /* @__PURE__ */ jsxs13(Box13, { flexDirection: "column", marginTop: 1, children: [
      /* @__PURE__ */ jsx16(Text15, { bold: true, color: theme.primary, children: "Recent Activity:" }),
      history.map((item, idx) => /* @__PURE__ */ jsxs13(Box13, { justifyContent: "space-between", children: [
        /* @__PURE__ */ jsxs13(Text15, { color: item.status === "completed" ? theme.primary : item.status === "failed" ? "red" : theme.gray, children: [
          item.status === "completed" ? "\u2713 " : item.status === "failed" ? "\u2717 " : "\u25B6 ",
          "@",
          item.profile.username,
          " (",
          item.profile.platform,
          ")"
        ] }),
        /* @__PURE__ */ jsx16(Text15, { color: theme.gray, dimColor: theme.dimSecondary, children: item.statusText })
      ] }, `${item.profile.cleanUrl}-${idx}`))
    ] }) : null,
    /* @__PURE__ */ jsx16(Gap2, {}),
    /* @__PURE__ */ jsxs13(Box13, { justifyContent: "space-between", children: [
      /* @__PURE__ */ jsx16(
        Box13,
        {
          borderStyle: "round",
          borderColor: focusedIndex === 0 ? theme.primary : theme.gray,
          borderDimColor: focusedIndex !== 0,
          paddingX: 1,
          children: /* @__PURE__ */ jsxs13(Text15, { color: focusedIndex === 0 ? theme.primary : theme.gray, bold: focusedIndex === 0, children: [
            "[c] Target: ",
            /* @__PURE__ */ jsx16(Text15, { color: theme.primary, bold: true, children: mediaChoice === "all" ? "EVERYTHING" : mediaChoice.toUpperCase() })
          ] })
        }
      ),
      /* @__PURE__ */ jsx16(
        Box13,
        {
          borderStyle: "round",
          borderColor: focusedIndex === 1 ? theme.primary : theme.gray,
          borderDimColor: focusedIndex !== 1,
          paddingX: 1,
          children: /* @__PURE__ */ jsxs13(Text15, { color: focusedIndex === 1 ? theme.primary : theme.gray, bold: focusedIndex === 1, children: [
            "[m] Sidecars: ",
            /* @__PURE__ */ jsx16(Text15, { color: theme.primary, bold: true, children: writeMetadata ? "ON" : "OFF" })
          ] })
        }
      ),
      /* @__PURE__ */ jsx16(
        Box13,
        {
          borderStyle: "round",
          borderColor: focusedIndex === 2 ? theme.primary : theme.gray,
          borderDimColor: focusedIndex !== 2,
          paddingX: 1,
          children: /* @__PURE__ */ jsx16(Text15, { color: focusedIndex === 2 ? theme.primary : theme.gray, bold: focusedIndex === 2, children: "[o] Open Folder" })
        }
      )
    ] }),
    /* @__PURE__ */ jsx16(Box13, { marginTop: 1, justifyContent: "center", children: /* @__PURE__ */ jsxs13(Text15, { color: theme.gray, dimColor: theme.dimSecondary, children: [
      "Session Stats: ",
      stats.detected,
      " detected \xB7 ",
      stats.downloaded,
      " downloaded \xB7 ",
      stats.skipped,
      " skipped"
    ] }) })
  ] }) }) });
}

// src/components/views/batch-view.tsx
import { useState as useState8, useRef as useRef4, useCallback as useCallback3, useEffect as useEffect8 } from "react";
import { Box as Box14, Text as Text16, useInput as useInput4 } from "ink";
import Spinner3 from "ink-spinner";
import fs17 from "fs";

// src/lib/batch.ts
import fsPromises5 from "fs/promises";
function parseBatchContent(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) {
      continue;
    }
    const hashIdx = line.indexOf(" #");
    if (hashIdx !== -1) {
      line = line.slice(0, hashIdx).trim();
    }
    const slashIdx = line.indexOf(" //");
    if (slashIdx !== -1) {
      line = line.slice(0, slashIdx).trim();
    }
    if (line) {
      result.push(line);
    }
  }
  return result;
}
async function loadBatchFile(filePath) {
  const content = await fsPromises5.readFile(filePath, "utf-8");
  return parseBatchContent(content);
}
async function runBatchQueue(options) {
  const rawEntries = options.lines ?? (options.filePath ? await loadBatchFile(options.filePath) : []);
  const choice = options.choice || "all";
  const minDelay = options.minDelayMs ?? 2e3;
  const maxDelay = options.maxDelayMs ?? 5e3;
  const items = rawEntries.map((raw) => {
    let profile = parseProfileInput(raw);
    if (options.defaultPlatform && profile.platform === "unknown" && profile.username) {
      profile = buildCanonicalProfile(options.defaultPlatform, profile.username, raw);
    }
    return {
      raw,
      profile,
      status: "pending",
      downloaded: 0,
      skipped: 0
    };
  });
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i++) {
    if (options.signal?.aborted) {
      break;
    }
    const item = items[i];
    item.status = "running";
    if (item.profile.platform === "unknown" || !item.profile.cleanUrl) {
      item.status = "failed";
      item.error = `Invalid profile URL or unsupported username: ${item.raw}`;
      failed++;
      options.onAccountError?.(item, new Error(item.error));
      continue;
    }
    options.onAccountStart?.(item, i, items.length);
    try {
      const targetDir = resolveDefaultDownloadDir(
        item.profile.platform,
        item.profile.username,
        options.outputDir
      );
      const res = await dispatchDownload({
        profile: item.profile,
        choice,
        outputDir: targetDir,
        since: options.since,
        until: options.until,
        limit: options.limit,
        resume: options.resume,
        writeMetadata: options.writeMetadata,
        signal: options.signal,
        runnerOverrides: options.runnerOverrides,
        onProgress: (progress) => {
          options.onAccountProgress?.(item, progress);
        }
      });
      item.downloaded = res.downloadedCount;
      item.skipped = res.skippedCount;
      totalDownloaded += res.downloadedCount;
      totalSkipped += res.skippedCount;
      if (res.success) {
        item.status = "success";
        succeeded++;
      } else {
        item.status = "failed";
        item.error = res.errors.join("; ") || "Download failed";
        failed++;
      }
      options.onAccountComplete?.(item, i, items.length);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      item.status = "failed";
      item.error = errMsg;
      failed++;
      options.onAccountError?.(item, err instanceof Error ? err : new Error(errMsg));
    }
    if (i < items.length - 1 && !options.signal?.aborted) {
      await sleep(minDelay, maxDelay, options.signal);
    }
  }
  return {
    total: items.length,
    succeeded,
    failed,
    totalDownloaded,
    totalSkipped,
    items
  };
}

// src/components/views/batch-view.tsx
import { Fragment as Fragment3, jsx as jsx17, jsxs as jsxs14 } from "react/jsx-runtime";
var PLATFORMS = ["instagram", "tiktok", "facebook", "x"];
var CHOICES2 = ["all", "photos", "videos", "stories", "highlights"];
var DATE_PRESETS = ["all", "24h", "7d", "30d", "2024", "2023", "2022", "2021", "custom"];
var LIMIT_PRESETS = [void 0, 10, 24, 50, 100, "custom"];
function BatchView({
  onBack,
  outputDir,
  boxWidth,
  theme,
  gapComponent: Gap2,
  defaultChoice = "all",
  defaultLimit,
  defaultWriteMetadata = false,
  onRegisterClickTargets
}) {
  const [phase, setPhase] = useState8("input");
  const [inputField, setInputField] = useState8("text");
  const [rawText, setRawText] = useState8("");
  const [filePath, setFilePath] = useState8("");
  const [errorMessage, setErrorMessage] = useState8(null);
  const [focusedControl, setFocusedControl] = useState8("input");
  const [customLimitText, setCustomLimitText] = useState8("");
  const [customDateText, setCustomDateText] = useState8("");
  const [defaultPlatform, setDefaultPlatform] = useState8("instagram");
  const [choice, setChoice] = useState8(defaultChoice);
  const [limit, setLimit] = useState8(defaultLimit);
  const [dateFilter, setDateFilter] = useState8("all");
  const [writeMetadata, setWriteMetadata] = useState8(defaultWriteMetadata);
  const [resume, setResume] = useState8(true);
  const [queueItems, setQueueItems] = useState8([]);
  const [currentIndex, setCurrentIndex] = useState8(0);
  const [currentProgressText, setCurrentProgressText] = useState8("");
  const [isCooldown, setIsCooldown] = useState8(false);
  const [result, setResult] = useState8(null);
  const abortControllerRef = useRef4(null);
  const cyclePlatform = useCallback3(() => {
    setDefaultPlatform((prev) => {
      const idx = PLATFORMS.indexOf(prev);
      return PLATFORMS[(idx + 1) % PLATFORMS.length];
    });
  }, []);
  const cycleChoice = useCallback3(() => {
    setChoice((prev) => {
      const idx = CHOICES2.indexOf(prev);
      return CHOICES2[(idx + 1) % CHOICES2.length];
    });
  }, []);
  const cycleLimit = useCallback3(() => {
    const curIdx = LIMIT_PRESETS.findIndex((p) => p === limit);
    const nextIdx = (curIdx + 1) % LIMIT_PRESETS.length;
    const nextVal = LIMIT_PRESETS[nextIdx];
    if (nextVal === "custom") {
      setCustomLimitText(limit ? String(limit) : "24");
      setFocusedControl("custom-limit");
    } else {
      setLimit(nextVal);
    }
  }, [limit]);
  const cycleDate = useCallback3(() => {
    const curIdx = DATE_PRESETS.indexOf(dateFilter);
    const nextIdx = (curIdx + 1) % DATE_PRESETS.length;
    const nextVal = DATE_PRESETS[nextIdx];
    if (nextVal === "custom") {
      setCustomDateText(dateFilter !== "all" ? dateFilter : "2024");
      setFocusedControl("custom-date");
    } else {
      setDateFilter(nextVal);
    }
  }, [dateFilter]);
  const toggleMetadata = useCallback3(() => {
    setWriteMetadata((prev) => !prev);
  }, []);
  const toggleResume = useCallback3(() => {
    setResume((prev) => !prev);
  }, []);
  const startQueue = useCallback3(async () => {
    setErrorMessage(null);
    let lines = [];
    if (inputField === "file") {
      const trimmed = filePath.trim();
      if (!trimmed) {
        setErrorMessage("Please enter a valid batch file path");
        return;
      }
      if (!fs17.existsSync(trimmed)) {
        setErrorMessage(`File not found: ${trimmed}`);
        return;
      }
    } else {
      lines = Array.from(
        new Set(
          rawText.split(/[\r\n,;\s]+/).map((s) => s.trim()).filter(Boolean)
        )
      );
      if (lines.length === 0) {
        setErrorMessage("Please enter at least one profile URL or username");
        return;
      }
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setPhase("running");
    try {
      const dateRange = resolveDateFilter(dateFilter);
      const queueRes = await runBatchQueue({
        filePath: inputField === "file" ? filePath.trim() : void 0,
        lines: inputField === "text" ? lines : void 0,
        choice,
        defaultPlatform,
        outputDir,
        since: dateRange.since,
        until: dateRange.until,
        limit,
        resume,
        writeMetadata,
        signal: controller.signal,
        onAccountStart: (item, idx) => {
          setIsCooldown(false);
          setCurrentIndex(idx);
          setCurrentProgressText(`Probing @${item.profile.username || item.raw} on ${item.profile.platform}\u2026`);
          setQueueItems((prev) => {
            const next = [...prev];
            if (next[idx]) next[idx] = { ...item };
            else next.push({ ...item });
            return next;
          });
        },
        onAccountProgress: (_item, progress) => {
          setCurrentProgressText(progress.statusText);
        },
        onAccountComplete: (item, idx) => {
          setIsCooldown(true);
          setQueueItems((prev) => {
            const next = [...prev];
            next[idx] = { ...item };
            return next;
          });
        },
        onAccountError: (item) => {
          setQueueItems((prev) => {
            const idx = prev.findIndex((i) => i.raw === item.raw);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = { ...item };
              return next;
            }
            return prev;
          });
        }
      });
      setResult(queueRes);
      setPhase("done");
    } catch (err) {
      if (controller.signal.aborted) {
        setPhase("input");
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setPhase("input");
    }
  }, [inputField, filePath, rawText, choice, defaultPlatform, outputDir, dateFilter, limit, resume, writeMetadata]);
  useInput4((input, key) => {
    if (key.ctrl && (input === "c" || input === "C")) {
      return;
    }
    if (key.escape) {
      if (focusedControl === "custom-limit" || focusedControl === "custom-date") {
        setFocusedControl("start");
        return;
      }
      if (focusedControl !== "input" && phase === "input") {
        setFocusedControl("input");
        return;
      }
      if (phase === "running") {
        abortControllerRef.current?.abort();
        setPhase("input");
        return;
      }
      onBack();
      return;
    }
    if (phase === "done") {
      if (key.return) {
        setPhase("input");
        return;
      }
      if (input === "o" || input === "O") {
        const target = outputDir || resolveDefaultDownloadDir("instagram", "batch");
        revealInFileManager(target);
        return;
      }
      return;
    }
    if (phase === "running") {
      return;
    }
    if (phase === "input") {
      if (focusedControl === "custom-limit" || focusedControl === "custom-date") {
        return;
      }
      if (focusedControl === "input") {
        if (key.downArrow) {
          setFocusedControl("platform");
          return;
        }
        if (key.upArrow) {
          setFocusedControl("tabs");
          return;
        }
        return;
      }
      if (focusedControl === "tabs") {
        if (key.leftArrow || key.rightArrow || input === " " || key.return) {
          setInputField((prev) => prev === "text" ? "file" : "text");
          return;
        }
        if (key.downArrow || key.tab) {
          setFocusedControl("input");
          return;
        }
        return;
      }
      if (focusedControl === "platform") {
        if (key.rightArrow) {
          setFocusedControl("choice");
          return;
        }
        if (key.downArrow) {
          setFocusedControl("limit");
          return;
        }
        if (key.upArrow) {
          setFocusedControl("input");
          return;
        }
        if (key.tab && !key.shift) {
          setFocusedControl("choice");
          return;
        }
        if (key.tab && key.shift) {
          setFocusedControl("input");
          return;
        }
      } else if (focusedControl === "choice") {
        if (key.leftArrow) {
          setFocusedControl("platform");
          return;
        }
        if (key.downArrow) {
          setFocusedControl("date");
          return;
        }
        if (key.upArrow) {
          setFocusedControl("input");
          return;
        }
        if (key.tab && !key.shift) {
          setFocusedControl("limit");
          return;
        }
        if (key.tab && key.shift) {
          setFocusedControl("platform");
          return;
        }
      } else if (focusedControl === "limit") {
        if (key.upArrow) {
          setFocusedControl("platform");
          return;
        }
        if (key.rightArrow) {
          setFocusedControl("date");
          return;
        }
        if (key.downArrow) {
          setFocusedControl("meta");
          return;
        }
        if (key.tab && !key.shift) {
          setFocusedControl("date");
          return;
        }
        if (key.tab && key.shift) {
          setFocusedControl("choice");
          return;
        }
      } else if (focusedControl === "date") {
        if (key.upArrow) {
          setFocusedControl("choice");
          return;
        }
        if (key.leftArrow) {
          setFocusedControl("limit");
          return;
        }
        if (key.downArrow) {
          setFocusedControl("resume");
          return;
        }
        if (key.tab && !key.shift) {
          setFocusedControl("meta");
          return;
        }
        if (key.tab && key.shift) {
          setFocusedControl("limit");
          return;
        }
      } else if (focusedControl === "meta") {
        if (key.upArrow) {
          setFocusedControl("limit");
          return;
        }
        if (key.rightArrow) {
          setFocusedControl("resume");
          return;
        }
        if (key.downArrow) {
          setFocusedControl("start");
          return;
        }
        if (key.tab && !key.shift) {
          setFocusedControl("resume");
          return;
        }
        if (key.tab && key.shift) {
          setFocusedControl("date");
          return;
        }
      } else if (focusedControl === "resume") {
        if (key.upArrow) {
          setFocusedControl("date");
          return;
        }
        if (key.leftArrow) {
          setFocusedControl("meta");
          return;
        }
        if (key.downArrow) {
          setFocusedControl("start");
          return;
        }
        if (key.tab && !key.shift) {
          setFocusedControl("start");
          return;
        }
        if (key.tab && key.shift) {
          setFocusedControl("meta");
          return;
        }
      } else if (focusedControl === "start") {
        if (key.upArrow) {
          setFocusedControl("meta");
          return;
        }
        if (key.downArrow || key.tab && !key.shift) {
          setFocusedControl("tabs");
          return;
        }
        if (key.tab && key.shift) {
          setFocusedControl("resume");
          return;
        }
      }
      if (input === " " || key.return) {
        switch (focusedControl) {
          case "platform":
            cyclePlatform();
            break;
          case "choice":
            cycleChoice();
            break;
          case "limit":
            cycleLimit();
            break;
          case "date":
            cycleDate();
            break;
          case "meta":
            toggleMetadata();
            break;
          case "resume":
            toggleResume();
            break;
          case "start":
            startQueue();
            break;
        }
        return;
      }
      if (input === "p" || input === "P") {
        cyclePlatform();
        return;
      }
      if (input === "c" || input === "C") {
        cycleChoice();
        return;
      }
      if (input === "l" || input === "L") {
        cycleLimit();
        return;
      }
      if (input === "d" || input === "D") {
        cycleDate();
        return;
      }
      if (input === "m" || input === "M") {
        toggleMetadata();
        return;
      }
      if (input === "r" || input === "R") {
        toggleResume();
        return;
      }
    }
  }, { isActive: Boolean(process.stdin.isTTY) });
  useEffect8(() => {
    if (!onRegisterClickTargets) return;
    const targets = [];
    if (phase === "input") {
      targets.push({
        match: "Links / Handles",
        padX: 2,
        padY: 0,
        action: () => {
          setInputField("text");
          setFocusedControl("input");
        }
      });
      targets.push({
        match: "File (.txt)",
        padX: 2,
        padY: 0,
        action: () => {
          setInputField("file");
          setFocusedControl("input");
        }
      });
      targets.push({
        match: "download",
        padX: 2,
        padY: 1,
        action: startQueue
      });
      targets.push({
        match: "Platform:",
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl("platform");
          cyclePlatform();
        }
      });
      targets.push({
        match: "Media:",
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl("choice");
          cycleChoice();
        }
      });
      targets.push({
        match: "Posts:",
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl("limit");
          cycleLimit();
        }
      });
      targets.push({
        match: "Date:",
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl("date");
          cycleDate();
        }
      });
      targets.push({
        match: "Meta:",
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl("meta");
          toggleMetadata();
        }
      });
      targets.push({
        match: "Resume:",
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl("resume");
          toggleResume();
        }
      });
      targets.push({
        match: "Start Batch Queue",
        padX: 3,
        padY: 0,
        action: () => {
          setFocusedControl("start");
          startQueue();
        }
      });
      targets.push({
        match: "tab switch field",
        action: () => setInputField((prev) => prev === "text" ? "file" : "text")
      });
      targets.push({
        match: "c target",
        action: cycleChoice
      });
      targets.push({
        match: "m sidecar",
        action: toggleMetadata
      });
      targets.push({
        match: "l limit",
        action: cycleLimit
      });
      targets.push({
        match: "d date",
        action: cycleDate
      });
      targets.push({
        match: "r resume",
        action: toggleResume
      });
      targets.push({
        match: "\u21B5 start",
        action: startQueue
      });
    }
    if (phase === "running") {
      targets.push({
        match: "Stop queue and return",
        padX: 2,
        action: () => {
          abortControllerRef.current?.abort();
          setPhase("input");
        }
      });
      targets.push({
        match: "Stop queue",
        padX: 2,
        action: () => {
          abortControllerRef.current?.abort();
          setPhase("input");
        }
      });
    }
    if (phase === "done") {
      targets.push({
        match: "Open Downloads Folder",
        padX: 2,
        action: () => {
          const target = outputDir || resolveDefaultDownloadDir("instagram", "batch");
          revealInFileManager(target);
        }
      });
      targets.push({
        match: "Return to Start",
        padX: 2,
        action: () => setPhase("input")
      });
    }
    onRegisterClickTargets(targets);
    return () => {
      onRegisterClickTargets([]);
    };
  }, [
    phase,
    inputField,
    focusedControl,
    onRegisterClickTargets,
    cyclePlatform,
    cycleChoice,
    cycleLimit,
    cycleDate,
    toggleMetadata,
    toggleResume,
    startQueue,
    outputDir
  ]);
  const panelWidth = Math.max(64, boxWidth);
  const inputFrameWidth = panelWidth - 18;
  const innerContentWidth = panelWidth - 6;
  const colWidth = Math.floor((innerContentWidth - 4) / 2);
  const currentItem = queueItems[currentIndex];
  const completedCount = queueItems.filter((i) => i.status === "success" || i.status === "failed").length;
  const totalCount = queueItems.length > 0 ? queueItems.length : 1;
  const percent = Math.min(100, Math.floor(completedCount / totalCount * 100));
  return /* @__PURE__ */ jsxs14(Box14, { flexDirection: "column", alignItems: "center", children: [
    phase === "input" && /* @__PURE__ */ jsx17(Panel, { title: "Batch Queue", width: panelWidth, children: /* @__PURE__ */ jsxs14(Box14, { flexDirection: "column", alignItems: "center", paddingY: 1, children: [
      /* @__PURE__ */ jsxs14(Box14, { marginBottom: 1, justifyContent: "center", children: [
        /* @__PURE__ */ jsx17(Box14, { marginRight: 2, children: /* @__PURE__ */ jsx17(
          Text16,
          {
            bold: true,
            color: inputField === "text" ? theme.primary : theme.gray,
            inverse: inputField === "text",
            children: "  Links / Handles  "
          }
        ) }),
        /* @__PURE__ */ jsx17(Box14, { children: /* @__PURE__ */ jsx17(
          Text16,
          {
            bold: true,
            color: inputField === "file" ? theme.primary : theme.gray,
            inverse: inputField === "file",
            children: "  File (.txt)  "
          }
        ) })
      ] }),
      inputField === "text" ? /* @__PURE__ */ jsx17(
        FramedInput,
        {
          title: "Links or @handles",
          width: inputFrameWidth,
          button: "download",
          children: /* @__PURE__ */ jsx17(
            TextInput,
            {
              value: rawText,
              onChange: setRawText,
              onSubmit: startQueue,
              placeholder: "@user1, @user2, tiktok.com/@user3\u2026",
              width: inputFrameWidth - 4,
              focus: focusedControl === "input",
              onArrowDown: () => setFocusedControl("platform"),
              onArrowUp: () => setFocusedControl("tabs"),
              onTab: () => setFocusedControl("platform")
            }
          )
        }
      ) : /* @__PURE__ */ jsx17(
        FramedInput,
        {
          title: "Batch file (.txt)",
          width: inputFrameWidth,
          button: "download",
          children: /* @__PURE__ */ jsx17(
            TextInput,
            {
              value: filePath,
              onChange: setFilePath,
              onSubmit: startQueue,
              placeholder: "e.g. creators.txt or C:\\path\\creators.txt",
              width: inputFrameWidth - 4,
              focus: focusedControl === "input",
              onArrowDown: () => setFocusedControl("platform"),
              onArrowUp: () => setFocusedControl("tabs"),
              onTab: () => setFocusedControl("platform")
            }
          )
        }
      ),
      errorMessage ? /* @__PURE__ */ jsx17(Box14, { marginTop: 1, children: /* @__PURE__ */ jsxs14(Text16, { color: "red", children: [
        "\u2717 ",
        errorMessage
      ] }) }) : null,
      /* @__PURE__ */ jsx17(
        Box14,
        {
          flexDirection: "column",
          width: innerContentWidth,
          marginTop: 1,
          borderStyle: "round",
          borderColor: focusedControl !== "input" && focusedControl !== "tabs" && focusedControl !== "start" ? theme.primary : theme.gray,
          borderDimColor: focusedControl === "input" || focusedControl === "tabs" || focusedControl === "start",
          paddingX: 1,
          children: focusedControl === "custom-limit" ? /* @__PURE__ */ jsxs14(Box14, { flexDirection: "column", children: [
            /* @__PURE__ */ jsx17(Text16, { bold: true, color: theme.primary, children: "Set post limit (e.g. 24, all):" }),
            /* @__PURE__ */ jsx17(Box14, { marginTop: 1, children: /* @__PURE__ */ jsx17(
              TextInput,
              {
                value: customLimitText,
                onChange: setCustomLimitText,
                onSubmit: (val) => {
                  const parsed = parseLimit(val);
                  setLimit(parsed);
                  setFocusedControl("limit");
                },
                width: 24
              }
            ) }),
            /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u21B5 confirm \xB7 esc cancel" })
          ] }) : focusedControl === "custom-date" ? /* @__PURE__ */ jsxs14(Box14, { flexDirection: "column", children: [
            /* @__PURE__ */ jsx17(Text16, { bold: true, color: theme.primary, children: "Set date or year (e.g. 2024, 7d):" }),
            /* @__PURE__ */ jsx17(Box14, { marginTop: 1, children: /* @__PURE__ */ jsx17(
              TextInput,
              {
                value: customDateText,
                onChange: setCustomDateText,
                onSubmit: (val) => {
                  const trimmed = val.trim();
                  setDateFilter(trimmed ? trimmed : "all");
                  setFocusedControl("date");
                },
                width: 24
              }
            ) }),
            /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u21B5 confirm \xB7 esc cancel" })
          ] }) : /* @__PURE__ */ jsxs14(Fragment3, { children: [
            /* @__PURE__ */ jsxs14(Box14, { justifyContent: "space-between", width: "100%", children: [
              /* @__PURE__ */ jsxs14(Box14, { width: colWidth, children: [
                /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "[p] Platform: " }),
                /* @__PURE__ */ jsx17(
                  Text16,
                  {
                    bold: true,
                    color: theme.primary,
                    inverse: focusedControl === "platform",
                    children: ` ${defaultPlatform.toUpperCase()} `
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs14(Box14, { width: colWidth, children: [
                /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "[c] Media: " }),
                /* @__PURE__ */ jsx17(
                  Text16,
                  {
                    bold: true,
                    color: theme.primary,
                    inverse: focusedControl === "choice",
                    children: ` ${choice === "all" ? "EVERYTHING" : choice.toUpperCase()} `
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs14(Box14, { justifyContent: "space-between", width: "100%", marginTop: 1, children: [
              /* @__PURE__ */ jsxs14(Box14, { width: colWidth, children: [
                /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "[l] Posts: " }),
                /* @__PURE__ */ jsx17(
                  Text16,
                  {
                    bold: true,
                    color: theme.primary,
                    inverse: focusedControl === "limit",
                    children: ` ${limit ? String(limit) : "ALL"} `
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs14(Box14, { width: colWidth, children: [
                /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "[d] Date: " }),
                /* @__PURE__ */ jsx17(
                  Text16,
                  {
                    bold: true,
                    color: theme.primary,
                    inverse: focusedControl === "date",
                    children: ` ${dateFilter.toUpperCase()} `
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs14(Box14, { justifyContent: "space-between", width: "100%", marginTop: 1, children: [
              /* @__PURE__ */ jsxs14(Box14, { width: colWidth, children: [
                /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "[m] Meta: " }),
                /* @__PURE__ */ jsx17(
                  Text16,
                  {
                    bold: true,
                    color: theme.primary,
                    inverse: focusedControl === "meta",
                    children: ` ${writeMetadata ? "ON" : "OFF"} `
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs14(Box14, { width: colWidth, children: [
                /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "[r] Resume: " }),
                /* @__PURE__ */ jsx17(
                  Text16,
                  {
                    bold: true,
                    color: theme.primary,
                    inverse: focusedControl === "resume",
                    children: ` ${resume ? "ON" : "OFF"} `
                  }
                )
              ] })
            ] })
          ] })
        }
      ),
      /* @__PURE__ */ jsx17(Box14, { justifyContent: "center", marginTop: 1, children: /* @__PURE__ */ jsx17(
        Text16,
        {
          bold: true,
          color: theme.primary,
          inverse: focusedControl === "start",
          children: "  \u21B5 Start Batch Queue  "
        }
      ) }),
      /* @__PURE__ */ jsx17(Box14, { marginTop: 1, justifyContent: "center", children: /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: focusedControl === "input" ? "Type handles or URLs \xB7 \u21B5 or click download to start" : focusedControl === "tabs" ? "Space to switch mode \xB7 \u2193 to edit input" : "\u2190/\u2192/Tab select \xB7 Space/Enter toggle \xB7 \u21B5 start queue \xB7 \u2191 edit input" }) })
    ] }) }),
    phase === "running" && /* @__PURE__ */ jsx17(Panel, { title: "Batch Queue Running", width: panelWidth, children: /* @__PURE__ */ jsxs14(Box14, { flexDirection: "column", paddingY: 1, children: [
      /* @__PURE__ */ jsxs14(Box14, { justifyContent: "space-between", marginBottom: 1, children: [
        /* @__PURE__ */ jsxs14(Text16, { color: theme.primary, bold: true, children: [
          "Account ",
          currentIndex + 1,
          " of ",
          queueItems.length,
          " (",
          percent,
          "%)"
        ] }),
        /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: isCooldown ? "\u23F3 Cooldown active" : "\u25B6 Downloading" })
      ] }),
      /* @__PURE__ */ jsx17(ProgressBar, { percent, width: panelWidth - 10 }),
      /* @__PURE__ */ jsx17(Gap2, {}),
      currentItem ? /* @__PURE__ */ jsxs14(Box14, { flexDirection: "column", borderStyle: "round", borderColor: theme.primary, paddingX: 1, paddingY: 1, children: [
        /* @__PURE__ */ jsxs14(Box14, { children: [
          /* @__PURE__ */ jsx17(Text16, { color: theme.primary, children: /* @__PURE__ */ jsx17(Spinner3, { type: "dots" }) }),
          /* @__PURE__ */ jsx17(Text16, { bold: true, color: theme.primary, children: ` @${currentItem.profile.username || currentItem.raw} (${currentItem.profile.platform || "resolving"})` })
        ] }),
        /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: currentProgressText || "processing media items\u2026" })
      ] }) : null,
      /* @__PURE__ */ jsx17(Gap2, {}),
      /* @__PURE__ */ jsx17(Text16, { bold: true, color: theme.primary, children: "Queue Overview:" }),
      queueItems.slice(0, 5).map((item, idx) => /* @__PURE__ */ jsxs14(Box14, { justifyContent: "space-between", children: [
        /* @__PURE__ */ jsxs14(Text16, { color: item.status === "success" ? theme.primary : item.status === "failed" ? "red" : theme.gray, children: [
          item.status === "success" ? "\u2713 " : item.status === "failed" ? "\u2717 " : item.status === "running" ? "\u25B6 " : "\xB7 ",
          "@",
          item.profile.username || item.raw
        ] }),
        /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: item.status === "success" ? `${item.downloaded} downloaded, ${item.skipped} skipped` : item.status === "failed" ? item.error || "failed" : item.status === "running" ? "downloading\u2026" : "queued" })
      ] }, `${item.raw}-${idx}`)),
      /* @__PURE__ */ jsx17(Gap2, {}),
      /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "[esc] Stop queue and return" })
    ] }) }),
    phase === "done" && result && /* @__PURE__ */ jsx17(Panel, { title: "Batch Queue Completed", width: panelWidth, children: /* @__PURE__ */ jsxs14(Box14, { flexDirection: "column", paddingY: 1, children: [
      /* @__PURE__ */ jsxs14(Text16, { bold: true, color: theme.primary, children: [
        "\u2713 Successfully processed ",
        result.total,
        " profile(s)"
      ] }),
      /* @__PURE__ */ jsx17(Gap2, {}),
      /* @__PURE__ */ jsxs14(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: [
        "\u2022 Successful accounts: ",
        result.succeeded
      ] }),
      /* @__PURE__ */ jsxs14(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: [
        "\u2022 Failed accounts: ",
        result.failed
      ] }),
      /* @__PURE__ */ jsxs14(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: [
        "\u2022 Total media downloaded: ",
        result.totalDownloaded
      ] }),
      /* @__PURE__ */ jsxs14(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: [
        "\u2022 Total items skipped: ",
        result.totalSkipped
      ] }),
      /* @__PURE__ */ jsx17(Gap2, {}),
      /* @__PURE__ */ jsxs14(Box14, { justifyContent: "space-between", children: [
        /* @__PURE__ */ jsx17(Text16, { color: theme.primary, bold: true, children: "[o] Open Downloads Folder" }),
        /* @__PURE__ */ jsx17(Text16, { color: theme.gray, dimColor: theme.dimSecondary, children: "[\u21B5] Return to Start" })
      ] })
    ] }) })
  ] });
}

// src/lib/click-map.ts
var ANSI_PATTERN = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|"),
  "g"
);
var stripAnsi = (text) => text.replace(ANSI_PATTERN, "");
var frameLines = [];
function captureFrames(stream) {
  return new Proxy(stream, {
    get(target, prop) {
      if (prop === "write") {
        return (chunk, ...rest) => {
          const lines = String(chunk).split("\n").map(stripAnsi);
          if (lines.some((line) => line.trim() !== "")) frameLines = lines;
          return target.write(chunk, ...rest);
        };
      }
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
}
function clickTargetAt(x, y, targets) {
  for (const target of targets) {
    const { match, padX = 1, padY = 0 } = target;
    for (let row = y - 1 - padY; row <= y - 1 + padY; row++) {
      const line = frameLines[row];
      if (!line) continue;
      let index = line.indexOf(match);
      while (index !== -1) {
        if (x - 1 >= index - padX && x - 1 <= index + match.length - 1 + padX) return target;
        index = line.indexOf(match, index + 1);
      }
    }
  }
  return void 0;
}
function findFrameRow(text) {
  return frameLines.findIndex((line) => line.includes(text));
}
function frameRowSpan(row) {
  const line = frameLines[row];
  if (!line) return void 0;
  const first = line.search(/\S/);
  if (first === -1) return void 0;
  return [first + 1, line.trimEnd().length];
}

// src/lib/engines/core/use-engine-events.ts
import { useState as useState9, useEffect as useEffect9 } from "react";
var INITIAL_ENGINE_EVENT_STATE = {
  isDownloading: false,
  activeJob: void 0,
  progress: void 0,
  lastError: void 0,
  lastResult: void 0
};
function subscribeToEngineEvents(bus, onChange) {
  let state = { ...INITIAL_ENGINE_EVENT_STATE };
  const onJobStart = (payload) => {
    state = {
      ...state,
      isDownloading: true,
      activeJob: payload,
      progress: void 0,
      lastError: void 0,
      lastResult: void 0
    };
    onChange(state);
  };
  const onJobProgress = (payload) => {
    state = {
      ...state,
      isDownloading: true,
      progress: payload
    };
    onChange(state);
  };
  const onJobComplete = (payload) => {
    state = {
      ...state,
      isDownloading: false,
      lastResult: payload.result
    };
    onChange(state);
  };
  const onJobError = (payload) => {
    state = {
      ...state,
      isDownloading: false,
      lastError: payload.error
    };
    onChange(state);
  };
  const unsubStart = bus.on("job:start", onJobStart);
  const unsubProgress = bus.on("job:progress", onJobProgress);
  const unsubComplete = bus.on("job:complete", onJobComplete);
  const unsubError = bus.on("job:error", onJobError);
  return () => {
    if (typeof bus.off === "function") {
      bus.off("job:start", onJobStart);
      bus.off("job:progress", onJobProgress);
      bus.off("job:complete", onJobComplete);
      bus.off("job:error", onJobError);
    }
    unsubStart?.();
    unsubProgress?.();
    unsubComplete?.();
    unsubError?.();
  };
}
function useEngineEvents(customBus) {
  const bus = customBus || defaultTaskManager.events;
  const [state, setState] = useState9(() => ({
    ...INITIAL_ENGINE_EVENT_STATE
  }));
  useEffect9(() => {
    return subscribeToEngineEvents(bus, setState);
  }, [bus]);
  return state;
}

// src/app.tsx
import { Fragment as Fragment4, jsx as jsx18, jsxs as jsxs15 } from "react/jsx-runtime";
var TAGLINE = "grab any profile. paste. download. done.";
var DOWNLOAD_BUTTON = "download";
var Gap = ({ lines = 1 }) => /* @__PURE__ */ jsx18(Box15, { flexDirection: "column", flexShrink: 0, children: Array.from({ length: lines }, (_, i) => /* @__PURE__ */ jsx18(Text17, { children: " " }, i)) });
var HINTS = {
  input: [
    ["\u21B5", "download"],
    ["^w", "watcher"],
    ["^b", "batch"],
    ["^s", "settings"],
    ["^c", "quit"]
  ],
  platform: [
    ["\u2191\u2193", "choose"],
    ["\u21B5", "select"],
    ["esc", "back"],
    ["^c", "quit"]
  ],
  probing: [
    ["esc", "cancel"],
    ["^c", "quit"]
  ],
  picking: [
    ["\u2191\u2193", "choose"],
    ["\u21B5", "download"],
    ["esc", "back"],
    ["^c", "quit"]
  ],
  downloading: [
    ["esc", "cancel"],
    ["^c", "quit"]
  ],
  done: [
    ["o", "reveal"],
    ["\u21B5", "download another"],
    ["^c", "quit"]
  ],
  error: [
    ["\u21B5", "try again"],
    ["^c", "quit"]
  ],
  settings: [
    ["tab", "switch field"],
    ["\u21B5", "save"],
    ["esc", "back"],
    ["^c", "quit"]
  ],
  watcher: [
    ["c", "target"],
    ["m", "sidecar"],
    ["o", "open dir"],
    ["esc", "back"],
    ["^c", "quit"]
  ],
  batch: [
    ["tab", "switch field"],
    ["c", "target"],
    ["m", "sidecar"],
    ["l", "limit"],
    ["d", "date"],
    ["r", "resume"],
    ["\u21B5", "start"],
    ["esc", "back"],
    ["^c", "quit"]
  ]
};
function App({
  initialInput,
  initialChoice,
  initialThemeMode = "auto",
  outputDir,
  since,
  until,
  limit,
  resume,
  writeMetadata,
  version = "1.0.0"
}) {
  const [themeMode, setThemeMode] = useState10(initialThemeMode);
  const cycleTheme = useCallback4(() => {
    setThemeMode(nextThemeMode);
  }, []);
  return /* @__PURE__ */ jsx18(ThemeProvider, { mode: themeMode, children: /* @__PURE__ */ jsx18(
    InnerApp,
    {
      initialInput,
      initialChoice,
      outputDir,
      since,
      until,
      limit,
      resume,
      writeMetadata,
      version,
      cycleTheme
    }
  ) });
}
function InnerApp({
  initialInput,
  initialChoice,
  outputDir,
  since,
  until,
  limit,
  resume,
  writeMetadata,
  version = "1.0.0",
  cycleTheme
}) {
  const theme = useTheme();
  const { exit } = useApp();
  const { stdout } = useStdout3();
  const engineEvents = useEngineEvents();
  const config = useMemo3(() => loadConfig(), []);
  const effectiveLimit = limit ?? config.defaultLimit;
  const effectiveWriteMetadata = writeMetadata ?? Boolean(config.writeMetadata);
  const [urlInput, setUrlInput] = useState10(initialInput ?? "");
  const [clipboardUrl, setClipboardUrl] = useState10(void 0);
  const [settingsFocus, setSettingsFocus] = useState10("cookies");
  const [batchClickTargets, setBatchClickTargets] = useState10([]);
  const [watcherClickTargets, setWatcherClickTargets] = useState10([]);
  const columns = stdout?.columns && stdout.columns > 0 ? stdout.columns : 80;
  const boxWidth = Math.max(14, Math.min(64, columns - 6));
  const contentWidth = Math.max(10, Math.min(columns - 4, 78));
  const [phase, setPhase] = useState10(() => {
    if (initialInput) {
      const parsed = parseProfileInput(initialInput);
      if (parsed.platform !== "unknown" && parsed.cleanUrl) {
        return { name: "picking", profile: parsed };
      }
      if (parsed.platform === "unknown" && parsed.username) {
        return { name: "platform", username: parsed.username, rawInput: initialInput };
      }
    }
    return { name: "input" };
  });
  useEffect10(() => {
    try {
      const clip = readClipboard();
      if (clip && (clip.startsWith("http://") || clip.startsWith("https://") || clip.startsWith("@"))) {
        setClipboardUrl(clip.trim());
      }
    } catch {
    }
  }, []);
  const clipboardOffered = Boolean(clipboardUrl) && urlInput === "";
  const clipboardAccepted = Boolean(clipboardUrl) && urlInput === clipboardUrl;
  const abortControllerRef = useRef5(null);
  const probingTimeoutRef = useRef5(null);
  useEffect10(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (probingTimeoutRef.current) {
        clearTimeout(probingTimeoutRef.current);
      }
    };
  }, []);
  const resetToInput = useCallback4(() => {
    if (probingTimeoutRef.current) {
      clearTimeout(probingTimeoutRef.current);
      probingTimeoutRef.current = null;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setUrlInput("");
    setPhase({ name: "input" });
  }, []);
  const handleModeSelect = useCallback4(async (choiceOrOptions, profile) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const targetChoice = typeof choiceOrOptions === "string" ? choiceOrOptions : choiceOrOptions.choice;
    const targetLimit = typeof choiceOrOptions === "string" ? effectiveLimit : choiceOrOptions.limit ?? effectiveLimit;
    const targetSince = typeof choiceOrOptions === "string" ? since : choiceOrOptions.since ?? since;
    const targetUntil = typeof choiceOrOptions === "string" ? until : choiceOrOptions.until ?? until;
    const targetResume = typeof choiceOrOptions === "string" ? resume : choiceOrOptions.resume ?? resume;
    const targetWriteMetadata = typeof choiceOrOptions === "string" ? effectiveWriteMetadata : choiceOrOptions.writeMetadata ?? effectiveWriteMetadata;
    setPhase({ name: "downloading", profile, choice: targetChoice });
    try {
      const targetDir = resolveDefaultDownloadDir(profile.platform, profile.username, outputDir);
      const result = await dispatchDownload({
        profile,
        choice: targetChoice,
        outputDir: targetDir,
        since: targetSince,
        until: targetUntil,
        limit: targetLimit,
        resume: targetResume,
        writeMetadata: targetWriteMetadata,
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) {
            setPhase({ name: "downloading", profile, choice: targetChoice, progress });
          }
        }
      });
      if (controller.signal.aborted) return;
      if (!result.success && result.downloadedCount === 0 && result.skippedCount === 0) {
        const rawErr = result.errors[0] || "no media items could be found or downloaded.";
        const formatted = formatEngineError(rawErr);
        setPhase({
          name: "error",
          message: formatted.message,
          hint: formatted.hint
        });
      } else {
        setPhase({ name: "done", profile, result });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setPhase({
        name: "error",
        message: err.message || "An error occurred during download.",
        hint: "Check your internet connection or verify the profile exists."
      });
    }
  }, [outputDir, since, until, effectiveLimit, resume, effectiveWriteMetadata]);
  const handlePlatformSelect = useCallback4((platform, username, rawInput) => {
    const canonical = buildCanonicalProfile(platform, username, rawInput);
    setPhase({ name: "probing", target: canonical.cleanUrl, status: "probing profile\u2026" });
    if (probingTimeoutRef.current) clearTimeout(probingTimeoutRef.current);
    probingTimeoutRef.current = setTimeout(() => {
      probingTimeoutRef.current = null;
      if (initialChoice) {
        handleModeSelect(initialChoice, canonical);
      } else {
        setPhase({ name: "picking", profile: canonical });
      }
    }, 450);
  }, [initialChoice, handleModeSelect]);
  const handleInputSubmit = useCallback4((input) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const parsed = parseProfileInput(trimmed);
    if (parsed.platform !== "unknown" && parsed.cleanUrl) {
      setPhase({ name: "probing", target: trimmed, status: "probing profile\u2026" });
      if (probingTimeoutRef.current) clearTimeout(probingTimeoutRef.current);
      probingTimeoutRef.current = setTimeout(() => {
        probingTimeoutRef.current = null;
        if (initialChoice) {
          handleModeSelect(initialChoice, parsed);
        } else {
          setPhase({ name: "picking", profile: parsed });
        }
      }, 450);
      return;
    }
    if (parsed.platform === "unknown" && parsed.username) {
      setPhase({ name: "platform", username: parsed.username, rawInput: trimmed });
      return;
    }
    setPhase({
      name: "input",
      warning: "paste a full profile url (e.g. instagram.com/profile) or @profile"
    });
  }, [initialChoice, handleModeSelect]);
  useInput5((input, key) => {
    if (key.ctrl && input === "t") {
      cycleTheme();
      return;
    }
    if (key.ctrl && (input === "s" || input === "S")) {
      if (phase.name === "settings") {
        setPhase({ name: "input" });
      } else if (phase.name === "input") {
        setPhase({ name: "settings" });
      }
      return;
    }
    if (key.ctrl && (input === "w" || input === "W")) {
      if (phase.name === "watcher") {
        setPhase({ name: "input" });
        return;
      }
      if (phase.name === "input" && urlInput.length === 0) {
        setPhase({ name: "watcher" });
        return;
      }
      return;
    }
    if (key.ctrl && (input === "b" || input === "B")) {
      if (phase.name === "batch") {
        setPhase({ name: "input" });
      } else if (phase.name === "input") {
        setPhase({ name: "batch" });
      }
      return;
    }
    if (key.ctrl && input === "c") {
      exit();
      return;
    }
    if (key.escape) {
      if (phase.name === "settings" || phase.name === "watcher") {
        setPhase({ name: "input" });
        return;
      }
      if (phase.name === "batch") {
        return;
      }
      if (phase.name === "platform") {
        setPhase({ name: "input" });
        return;
      }
      if (phase.name === "probing" || phase.name === "downloading") {
        resetToInput();
        return;
      }
      if (phase.name === "picking" || phase.name === "done" || phase.name === "error") {
        resetToInput();
        return;
      }
      exit();
      return;
    }
    if (key.return) {
      if (phase.name === "done" || phase.name === "error") {
        resetToInput();
        return;
      }
    }
    if ((input === "o" || input === "O") && !key.ctrl) {
      if (phase.name === "done") {
        revealInFileManager(phase.result.outputDir);
        return;
      }
    }
  }, { isActive: Boolean(process.stdin.isTTY) });
  const hints = [...HINTS[phase.name], ["^t", `theme:${theme.mode}`]];
  const releaseUrl = `https://github.com/OpenSelena/open-nami/releases/tag/v${version}`;
  const clickTargets = useMemo3(() => {
    const hintAction = (key) => {
      if (key === "^c") return () => exit();
      if (key === "^t") return cycleTheme;
      if (key === "^s") return () => setPhase((prev) => prev.name === "settings" ? { name: "input" } : { name: "settings" });
      if (key === "^w") return () => setPhase((prev) => prev.name === "watcher" ? { name: "input" } : { name: "watcher" });
      if (key === "^b") return () => setPhase((prev) => prev.name === "batch" ? { name: "input" } : { name: "batch" });
      if (key === "esc") {
        if (phase.name === "settings" || phase.name === "platform" || phase.name === "watcher" || phase.name === "batch") {
          return () => setPhase({ name: "input" });
        }
        return resetToInput;
      }
      if (key === "\u21B5") {
        if (phase.name === "input") return () => handleInputSubmit(urlInput);
        if (phase.name === "done" || phase.name === "error") return resetToInput;
      }
      if (key === "o") {
        if (phase.name === "done") return () => revealInFileManager(phase.result.outputDir);
      }
      return void 0;
    };
    const targets = [];
    if (phase.name === "input") {
      targets.push({ match: `v${version}`, padX: 1, action: () => openBrowser(releaseUrl) });
      targets.push({ match: `  ${DOWNLOAD_BUTTON}  `, padY: 1, action: () => handleInputSubmit(urlInput) });
      if (clipboardOffered && clipboardUrl) {
        targets.push({ match: "Tab to paste it", action: () => setUrlInput(clipboardUrl) });
        targets.push({ match: "link in your clipboard", action: () => setUrlInput(clipboardUrl) });
      }
      if (clipboardAccepted) {
        targets.push({ match: "to download it", action: () => handleInputSubmit(urlInput) });
      }
      targets.push({ match: "OpenSelena", padX: 1, action: () => openBrowser("https://github.com/OpenSelena/open-nami") });
    }
    if (phase.name === "platform") {
      for (const item of PLATFORM_OPTIONS) {
        targets.push({
          match: item.label,
          padX: 2,
          action: () => handlePlatformSelect(item.value, phase.username, phase.rawInput)
        });
      }
    }
    if (phase.name === "picking") {
      const items = getPickingOptions(phase.profile.platform);
      for (const item of items) {
        targets.push({
          match: item.label,
          action: () => handleModeSelect(item.value, phase.profile)
        });
        const tag = `[${item.value === "all" ? "EVERYTHING" : item.value.toUpperCase()}]`;
        targets.push({
          match: tag,
          action: () => handleModeSelect(item.value, phase.profile)
        });
        if (item.description) {
          targets.push({
            match: item.description,
            action: () => handleModeSelect(item.value, phase.profile)
          });
        }
      }
    }
    if (phase.name === "done") {
      targets.push({ match: "\u21B5 download another", padX: 4, padY: 1, action: resetToInput });
      targets.push({ match: "[o] reveal in folder", padX: 1, action: () => revealInFileManager(phase.result.outputDir) });
    }
    if (phase.name === "settings") {
      targets.push({ match: "Cookies Folder", padX: 2, padY: 1, action: () => setSettingsFocus("cookies") });
      targets.push({ match: "Download Directory", padX: 2, padY: 1, action: () => setSettingsFocus("download") });
    }
    if (phase.name === "batch") {
      targets.push(...batchClickTargets);
    }
    if (phase.name === "watcher") {
      targets.push(...watcherClickTargets);
    }
    for (const [key, label] of hints) {
      const action = hintAction(key);
      if (action) targets.push({ match: `${key} ${label}`, action });
    }
    return targets;
  }, [
    phase,
    version,
    releaseUrl,
    urlInput,
    clipboardOffered,
    clipboardUrl,
    clipboardAccepted,
    hints,
    cycleTheme,
    exit,
    handleInputSubmit,
    handlePlatformSelect,
    handleModeSelect,
    resetToInput,
    batchClickTargets,
    watcherClickTargets
  ]);
  useMouseClick(
    (x, y) => {
      const taglineRow = findFrameRow(TAGLINE);
      if (taglineRow > 3 && y - 1 >= taglineRow - 4 && y - 1 <= taglineRow - 2) {
        const span = frameRowSpan(y - 1);
        if (span && x >= span[0] - 1 && x <= span[1] + 1) {
          if (phase.name !== "input") resetToInput();
          return;
        }
      }
      clickTargetAt(x, y, clickTargets)?.action();
    },
    Boolean(process.stdin.isTTY)
  );
  return /* @__PURE__ */ jsxs15(FullScreen, { children: [
    /* @__PURE__ */ jsx18(Logo, {}),
    /* @__PURE__ */ jsx18(Gap, {}),
    /* @__PURE__ */ jsx18(Text17, { color: theme.primary, children: TAGLINE }),
    /* @__PURE__ */ jsx18(Text17, { color: theme.gray, dimColor: theme.dimSecondary, children: "instagram \xB7 tiktok \xB7 facebook \xB7 x \xB7 +more" }),
    /* @__PURE__ */ jsx18(Gap, {}),
    phase.name === "input" && /* @__PURE__ */ jsx18(
      InputView,
      {
        urlInput,
        setUrlInput,
        onSubmit: handleInputSubmit,
        boxWidth,
        clipboardOffered,
        clipboardAccepted,
        clipboardUrl,
        warning: phase.warning,
        version,
        releaseUrl,
        theme,
        buttonText: DOWNLOAD_BUTTON,
        gapComponent: Gap
      }
    ),
    phase.name === "platform" && /* @__PURE__ */ jsx18(
      PlatformView,
      {
        contentWidth,
        username: phase.username,
        onSelect: (platform) => handlePlatformSelect(platform, phase.username, phase.rawInput),
        theme,
        gapComponent: Gap
      }
    ),
    phase.name === "probing" && /* @__PURE__ */ jsx18(
      ProbingView,
      {
        target: phase.target,
        boxWidth,
        theme,
        buttonText: DOWNLOAD_BUTTON
      }
    ),
    phase.name === "picking" && /* @__PURE__ */ jsx18(
      PickingView,
      {
        contentWidth,
        profile: phase.profile,
        outputDir,
        initialLimit: effectiveLimit,
        initialSince: since,
        initialUntil: until,
        initialWriteMetadata: effectiveWriteMetadata,
        initialResume: resume,
        onSelect: (choiceOrOptions) => handleModeSelect(choiceOrOptions, phase.profile),
        theme,
        gapComponent: Gap
      }
    ),
    phase.name === "downloading" && /* @__PURE__ */ jsx18(
      DownloadingView,
      {
        profile: phase.profile,
        choice: phase.choice,
        progress: engineEvents.progress ?? phase.progress,
        outputDir: resolveDefaultDownloadDir(phase.profile.platform, phase.profile.username, outputDir),
        writeMetadata: effectiveWriteMetadata,
        limit: effectiveLimit,
        since,
        theme,
        gapComponent: Gap
      }
    ),
    phase.name === "done" && /* @__PURE__ */ jsx18(
      CompletionView,
      {
        profile: phase.profile,
        result: phase.result,
        theme,
        gapComponent: Gap
      }
    ),
    phase.name === "error" && /* @__PURE__ */ jsx18(
      ErrorView,
      {
        message: phase.message,
        hint: phase.hint,
        columns,
        theme
      }
    ),
    phase.name === "settings" && /* @__PURE__ */ jsx18(
      SettingsView,
      {
        boxWidth,
        theme,
        gapComponent: Gap,
        focusedField: settingsFocus,
        onFocusChange: setSettingsFocus,
        onSave: () => setPhase({ name: "input" }),
        onCancel: () => setPhase({ name: "input" })
      }
    ),
    phase.name === "watcher" && /* @__PURE__ */ jsx18(
      WatcherView,
      {
        onBack: resetToInput,
        outputDir,
        theme,
        gapComponent: Gap,
        defaultChoice: initialChoice,
        defaultWriteMetadata: effectiveWriteMetadata,
        onRegisterClickTargets: setWatcherClickTargets
      }
    ),
    phase.name === "batch" && /* @__PURE__ */ jsx18(
      BatchView,
      {
        onBack: resetToInput,
        outputDir,
        boxWidth,
        contentWidth,
        theme,
        gapComponent: Gap,
        defaultChoice: initialChoice,
        defaultLimit: effectiveLimit,
        defaultWriteMetadata: effectiveWriteMetadata,
        onRegisterClickTargets: setBatchClickTargets
      }
    ),
    hints.length > 0 ? /* @__PURE__ */ jsxs15(Fragment4, { children: [
      /* @__PURE__ */ jsx18(Gap, { lines: 2 }),
      /* @__PURE__ */ jsx18(
        Shortcuts,
        {
          items: hints,
          leading: phase.name === "probing" ? /* @__PURE__ */ jsxs15(Text17, { children: [
            /* @__PURE__ */ jsx18(Text17, { color: theme.primary, children: /* @__PURE__ */ jsx18(Spinner4, { type: "dots" }) }),
            /* @__PURE__ */ jsxs15(Text17, { color: theme.gray, dimColor: theme.dimSecondary, children: [
              " ",
              phase.status
            ] })
          ] }) : void 0
        }
      )
    ] }) : null
  ] });
}

// src/lib/completion.ts
var SUPPORTED_SHELLS = ["bash", "zsh", "fish", "powershell"];
function normalizeShell(shell) {
  const normalized = shell.toLowerCase().trim();
  if (normalized === "pwsh") return "powershell";
  if (SUPPORTED_SHELLS.includes(normalized)) {
    return normalized;
  }
  return void 0;
}
function generateBashCompletion() {
  return `# bash completion for open-nami
# To load completions in current shell session:
#   eval "$(open-nami --completion bash)"
# Or install persistently:
#   open-nami --completion bash > ~/.local/share/bash-completion/completions/open-nami

_open_nami_completions() {
    local cur prev
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    local options="--help -h --version -v --update -U --update-ytdlp --update-gallerydl --photos --videos --stories --highlights --all --output -o --theme --completion"

    case "$prev" in
        --theme)
            COMPREPLY=($(compgen -W "auto light dark" -- "$cur"))
            return 0
            ;;
        --completion)
            COMPREPLY=($(compgen -W "bash zsh fish powershell" -- "$cur"))
            return 0
            ;;
        -o|--output)
            COMPREPLY=($(compgen -d -- "$cur"))
            return 0
            ;;
    esac

    if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "$options" -- "$cur"))
        return 0
    fi
}

complete -F _open_nami_completions open-nami
complete -F _open_nami_completions opennami
complete -F _open_nami_completions nami
complete -F _open_nami_completions on
`;
}
function generateZshCompletion() {
  return `#compdef open-nami opennami nami on
# zsh completion for open-nami
# To load completions in current session:
#   eval "$(open-nami --completion zsh)"

_open_nami() {
    _arguments -s -S \\
        '(-h --help)'{-h,--help}'[Show help message]' \\
        '(-v --version)'{-v,--version}'[Show version number]' \\
        '(-U --update)'{-U,--update}'[Update bundled engines]' \\
        '--update-ytdlp[Update only bundled yt-dlp binary]' \\
        '--update-gallerydl[Update only bundled gallery-dl binary]' \\
        '--photos[Download photos only]' \\
        '--videos[Download videos and reels only]' \\
        '--stories[Download stories only (Instagram)]' \\
        '--highlights[Download highlights only (Instagram)]' \\
        '--all[Download all available media]' \\
        '(-o --output)'{-o,--output}'[Destination download directory]:output directory:_files -/' \\
        '--theme[Set color theme]:theme:(auto light dark)' \\
        '--completion[Generate shell autocompletion script]:shell:(bash zsh fish powershell)'
}

if [[ -n "$ZSH_VERSION" ]]; then
    compdef _open_nami open-nami
    compdef _open_nami opennami
    compdef _open_nami nami
    compdef _open_nami on
fi
`;
}
function generateFishCompletion() {
  return `# fish completion for open-nami
# To load completions in current session:
#   open-nami --completion fish | source

complete -c open-nami -f

complete -c open-nami -s h -l help -d "Show help message"
complete -c open-nami -s v -l version -d "Show version number"
complete -c open-nami -s U -l update -d "Update bundled engines"
complete -c open-nami -l update-ytdlp -d "Update only bundled yt-dlp binary"
complete -c open-nami -l update-gallerydl -d "Update only bundled gallery-dl binary"
complete -c open-nami -l photos -d "Download photos only"
complete -c open-nami -l videos -d "Download videos and reels only"
complete -c open-nami -l stories -d "Download stories only (Instagram)"
complete -c open-nami -l highlights -d "Download highlights only (Instagram)"
complete -c open-nami -l all -d "Download all available media"
complete -c open-nami -s o -l output -r -a "(__fish_complete_directories)" -d "Destination directory"
complete -c open-nami -l theme -x -a "auto light dark" -d "Set color theme"
complete -c open-nami -l completion -x -a "bash zsh fish powershell" -d "Generate shell autocompletion script"

for cmd in opennami nami on
    complete -c $cmd -w open-nami
end
`;
}
function generatePowerShellCompletion() {
  return `# PowerShell completion for open-nami
# To load completions in current session:
#   open-nami --completion powershell | Out-String | Invoke-Expression

$completer = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $elements = $commandAst.CommandElements
    $lastWord = if ($elements.Count -gt 0) { $elements[-1].Extent.Text } else { '' }
    $secondLastWord = if ($elements.Count -gt 1) { $elements[-2].Extent.Text } else { '' }
    $prev = if ([string]::IsNullOrEmpty($wordToComplete)) { $lastWord } else { $secondLastWord }

    if ($prev -eq '--theme') {
        $themes = @('auto', 'light', 'dark')
        $themes | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Theme: $_")
        }
        return
    }

    if ($prev -eq '--completion') {
        $shells = @('bash', 'zsh', 'fish', 'powershell')
        $shells | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Shell: $_")
        }
        return
    }

    if ($wordToComplete -like '-*') {
        $options = @(
            [PSCustomObject]@{ Option = '--help'; Short = '-h'; Tooltip = 'Show help message' },
            [PSCustomObject]@{ Option = '--version'; Short = '-v'; Tooltip = 'Show version number' },
            [PSCustomObject]@{ Option = '--update'; Short = '-U'; Tooltip = 'Update bundled engines' },
            [PSCustomObject]@{ Option = '--update-ytdlp'; Short = $null; Tooltip = 'Update only bundled yt-dlp binary' },
            [PSCustomObject]@{ Option = '--update-gallerydl'; Short = $null; Tooltip = 'Update only bundled gallery-dl binary' },
            [PSCustomObject]@{ Option = '--photos'; Short = $null; Tooltip = 'Download photos only' },
            [PSCustomObject]@{ Option = '--videos'; Short = $null; Tooltip = 'Download videos and reels only' },
            [PSCustomObject]@{ Option = '--stories'; Short = $null; Tooltip = 'Download stories only (Instagram)' },
            [PSCustomObject]@{ Option = '--highlights'; Short = $null; Tooltip = 'Download highlights only (Instagram)' },
            [PSCustomObject]@{ Option = '--all'; Short = $null; Tooltip = 'Download all available media' },
            [PSCustomObject]@{ Option = '--output'; Short = '-o'; Tooltip = 'Destination directory' },
            [PSCustomObject]@{ Option = '--theme'; Short = $null; Tooltip = 'Set color theme (auto, light, dark)' },
            [PSCustomObject]@{ Option = '--completion'; Short = $null; Tooltip = 'Generate shell completion script' }
        )

        foreach ($opt in $options) {
            if ($opt.Option -like "$wordToComplete*") {
                [System.Management.Automation.CompletionResult]::new($opt.Option, $opt.Option, 'ParameterName', $opt.Tooltip)
            }
            if ($opt.Short -and $opt.Short -like "$wordToComplete*") {
                [System.Management.Automation.CompletionResult]::new($opt.Short, $opt.Short, 'ParameterName', $opt.Tooltip)
            }
        }
        return
    }
}

'open-nami', 'opennami', 'nami', 'on' | ForEach-Object {
    Register-ArgumentCompleter -Native -CommandName $_ -ScriptBlock $completer
}
`;
}
function generateCompletion(shell) {
  const target = normalizeShell(shell);
  if (!target) {
    throw new Error(
      `Unsupported shell "${shell}". Supported shells: ${SUPPORTED_SHELLS.join(", ")} (or "pwsh" for powershell).`
    );
  }
  switch (target) {
    case "bash":
      return generateBashCompletion();
    case "zsh":
      return generateZshCompletion();
    case "fish":
      return generateFishCompletion();
    case "powershell":
      return generatePowerShellCompletion();
  }
}

// src/cli.tsx
import { jsx as jsx19 } from "react/jsx-runtime";
var resolveVersion = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta?.url) {
      return createRequire2(import.meta.url)("../package.json").version;
    }
  } catch {
  }
  try {
    return require_package().version;
  } catch {
  }
  return "1.0.0";
};
var VERSION = resolveVersion();
var HELP = `
  Open Nami: bulk social media profile downloader for Instagram, TikTok, Facebook & X.

  Usage:
    $ open-nami                          Launch interactive TUI
    $ open-nami <profile-url-or-user>    Open directly to format picker
    $ open-nami <url> --photos           Download photos directly
    $ open-nami <url> --videos           Download videos directly
    $ open-nami <url> --all              Download all media directly

  Options:
    -h, --help           Show this help message
    -v, --version        Show version
    --doctor             Run environment & dependency diagnostics
    -o, --output         Set custom output directory
    -w, --watch          Watch clipboard for profile links and auto-download
    -b, --batch <file>   Download multiple profiles listed in a text file (one URL/user per line)
    -U, --update         Update bundled engines (yt-dlp and gallery-dl) to latest release
    --update-ytdlp       Update only bundled yt-dlp binary
    --update-gallerydl   Update only bundled gallery-dl binary
    --theme              Set color theme (auto, light, or dark)
    --photos             Download photos only
    --videos             Download videos & reels only
    --stories            Download stories only (Instagram)
    --highlights         Download highlights only (Instagram)
    --all                Download all available media
    --since <date>       Filter posts on or after date (YYYY-MM-DD or 7d, 30d)
    --until <date>       Filter posts on or before date (YYYY-MM-DD)
    -l, --limit <n>      Limit maximum items to download
    --resume             Resume download from saved pagination checkpoint
    --write-metadata     Save post metadata & captions to sidecar .json files
    --completion         Generate shell completion script (bash, zsh, fish, powershell)

  Hotkeys in TUI:
    [Tab]            Paste from clipboard
    [\u2191 / \u2193]          Navigate menus
    [Enter]          Submit / Start Download
    [^w]             Clipboard Watcher Radar
    [^b]             Batch Multi-Account Queue Manager
    [^s]             Settings & Preferences
    [^t]             Cycle theme (auto / light / dark)
    [m]              Toggle metadata sidecars (.json)
    [d]              Cycle date range filter (All / 24h / 7d / 30d)
    [l]              Cycle post download limit (All / 10 / 25 / 50 / 100)
    [r]              Toggle resumable checkpoints
    [o]              Open Downloads folder on completion
    [Esc]            Back / Exit
`;
var enterAltScreen = () => process.stdout.write("\x1B[?1049h\x1B[H");
var leaveAltScreen = () => process.stdout.write("\x1B[?1006l\x1B[?1000l\x1B[?1049l");
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(HELP);
    process.exit(0);
  }
  if (args.includes("-v") || args.includes("--version")) {
    console.log(`open-nami v${VERSION}`);
    process.exit(0);
  }
  if (args.includes("--doctor")) {
    const report = await runDoctor();
    console.log(`
  \x1B[36mOpen Nami Doctor\x1B[0m (v${VERSION})
`);
    console.log(`  \x1B[1mRuntime:\x1B[0m Node.js ${report.nodeVersion}`);
    console.log(`  \x1B[1mStorage:\x1B[0m ${report.storageOk ? "\x1B[32m\u2713 Ready\x1B[0m" : "\x1B[31m\u2717 Inaccessible\x1B[0m"}`);
    console.log(`  \x1B[1mEngines:\x1B[0m`);
    for (const [bin, ok] of Object.entries(report.binaries)) {
      console.log(`    ${ok ? "\x1B[32m\u2713\x1B[0m" : "\x1B[31m\u2717\x1B[0m"} ${bin}`);
    }
    console.log(`  \x1B[1mCookies:\x1B[0m`);
    for (const [platform, ok] of Object.entries(report.cookies)) {
      console.log(`    ${ok ? "\x1B[32m\u2713\x1B[0m" : "\x1B[90m\u25CB\x1B[0m"} ${platform}`);
    }
    console.log();
    process.exit(0);
  }
  const completionIdx = args.findIndex((arg) => arg === "--completion" || arg.startsWith("--completion="));
  if (completionIdx !== -1) {
    const arg = args[completionIdx];
    const shell = arg.startsWith("--completion=") ? arg.slice("--completion=".length) : args[completionIdx + 1];
    if (!shell || shell.startsWith("-")) {
      console.error("Error: --completion requires a shell name (bash, zsh, fish, powershell).");
      process.exit(1);
    }
    try {
      console.log(generateCompletion(shell));
      process.exit(0);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  }
  if (args.includes("-U") || args.includes("--update") || args.includes("--update-ytdlp") || args.includes("--update-gallerydl")) {
    const doYt = args.includes("-U") || args.includes("--update") || args.includes("--update-ytdlp");
    const doGdl = args.includes("-U") || args.includes("--update") || args.includes("--update-gallerydl");
    let hasFailure = false;
    if (doYt) {
      try {
        const res = await updateYtDlp({
          onStatus: (status) => console.error(`[open-nami] ${status}`)
        });
        if (res.updated) {
          if (res.previousVersion && res.previousVersion !== res.currentVersion) {
            console.log(`\u2713 yt-dlp updated: ${res.previousVersion} \u2192 ${res.currentVersion}`);
          } else {
            console.log(`\u2713 yt-dlp updated to version ${res.currentVersion}`);
          }
        } else {
          console.log(`\u2713 yt-dlp is already up to date (version ${res.currentVersion})`);
        }
      } catch (err) {
        console.error(`open-nami: yt-dlp update failed: ${err.message || String(err)}`);
        hasFailure = true;
      }
    }
    if (doGdl) {
      try {
        const res = await updateGalleryDl({
          onStatus: (status) => console.error(`[open-nami] ${status}`)
        });
        if (res.updated) {
          if (res.previousVersion && res.previousVersion !== res.currentVersion) {
            console.log(`\u2713 gallery-dl updated: ${res.previousVersion} \u2192 ${res.currentVersion}`);
          } else {
            console.log(`\u2713 gallery-dl updated to version ${res.currentVersion}`);
          }
        } else {
          console.log(`\u2713 gallery-dl is already up to date (version ${res.currentVersion})`);
        }
      } catch (err) {
        console.error(`open-nami: gallery-dl update failed: ${err.message || String(err)}`);
        hasFailure = true;
      }
    }
    process.exit(hasFailure ? 1 : 0);
  }
  let initialInput;
  let initialChoice;
  let outputDir;
  let themeMode = "auto";
  let isWatchMode = false;
  let batchFile;
  let cliPlatform;
  let since;
  let until;
  let limit;
  let isResume = false;
  let writeMetadata = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-o" || arg === "--output") {
      outputDir = args[++i];
    } else if (arg.startsWith("--output=")) {
      outputDir = arg.slice("--output=".length);
    } else if (arg === "-w" || arg === "--watch") {
      isWatchMode = true;
    } else if (arg === "--theme") {
      themeMode = args[++i];
    } else if (arg.startsWith("--theme=")) {
      themeMode = arg.slice("--theme=".length);
    } else if (arg === "--photos") {
      initialChoice = "photos";
    } else if (arg === "--videos") {
      initialChoice = "videos";
    } else if (arg === "--stories") {
      initialChoice = "stories";
    } else if (arg === "--highlights") {
      initialChoice = "highlights";
    } else if (arg === "--all") {
      initialChoice = "all";
    } else if (arg === "--since") {
      since = args[++i];
    } else if (arg.startsWith("--since=")) {
      since = arg.slice("--since=".length);
    } else if (arg === "--until") {
      until = args[++i];
    } else if (arg.startsWith("--until=")) {
      until = arg.slice("--until=".length);
    } else if (arg === "-l" || arg === "--limit") {
      const parsed = parseInt(args[++i], 10);
      if (!isNaN(parsed) && parsed > 0) limit = parsed;
    } else if (arg.startsWith("--limit=")) {
      const parsed = parseInt(arg.slice("--limit=".length), 10);
      if (!isNaN(parsed) && parsed > 0) limit = parsed;
    } else if (arg === "--resume") {
      isResume = true;
    } else if (arg === "--write-metadata") {
      writeMetadata = true;
    } else if (arg === "-b" || arg === "--batch") {
      batchFile = args[++i];
    } else if (arg.startsWith("--batch=")) {
      batchFile = arg.slice("--batch=".length);
    } else if (arg === "-p" || arg === "--platform") {
      const val = args[++i]?.toLowerCase();
      if (val === "instagram" || val === "tiktok" || val === "facebook" || val === "x") {
        cliPlatform = val;
      }
    } else if (arg.startsWith("--platform=")) {
      const val = arg.slice("--platform=".length).toLowerCase();
      if (val === "instagram" || val === "tiktok" || val === "facebook" || val === "x") {
        cliPlatform = val;
      }
    } else if (!arg.startsWith("-") && !initialInput) {
      initialInput = arg;
    }
  }
  if (isWatchMode) {
    const choice = initialChoice || "all";
    console.log(`
  \x1B[36mOpen Nami\x1B[0m: Clipboard Watcher Active (v${VERSION})`);
    console.log(`  \x1B[90mTarget media:\x1B[0m \x1B[33m${choice}\x1B[0m`);
    if (outputDir) console.log(`  \x1B[90mOutput directory:\x1B[0m ${outputDir}`);
    console.log(`  \x1B[90mMonitoring clipboard for Instagram, TikTok, Facebook & X profiles\u2026\x1B[0m`);
    console.log(`  \x1B[90mPress Ctrl+C to stop.\x1B[0m
`);
    const controller = new AbortController();
    process.on("SIGINT", () => {
      console.log("\n[open-nami] Stopping clipboard watcher\u2026");
      controller.abort();
      process.exit(0);
    });
    const { promise } = startClipboardWatcher({
      choice,
      outputDir,
      writeMetadata,
      signal: controller.signal,
      onDetected: (p) => {
        console.log(`
\u276F \x1B[32mDetected:\x1B[0m @${p.username} on \x1B[35m${p.platform}\x1B[0m`);
        console.log(`  \x1B[90mDownloading ${choice}\u2026\x1B[0m`);
      },
      onProgress: (_p, statusText) => {
        process.stdout.write(`\r  \x1B[90m\u2192 ${statusText.slice(0, 70)}\x1B[0m\x1B[K`);
      },
      onComplete: (p, res) => {
        process.stdout.write("\r\x1B[K");
        console.log(`\u2713 \x1B[32mFinished @${p.username}:\x1B[0m ${res.downloadedCount} downloaded, ${res.skippedCount} skipped`);
        if (res.outputDir) console.log(`  \x1B[90mSaved to:\x1B[0m ${res.outputDir}`);
      },
      onError: (p, err) => {
        process.stdout.write("\r\x1B[K");
        console.error(`\u2717 \x1B[31mError downloading @${p.username}:\x1B[0m ${err.message}`);
      }
    });
    await promise;
    process.exit(0);
  }
  if (batchFile) {
    const choice = initialChoice || "all";
    console.log(`
  \x1B[36mOpen Nami\x1B[0m: Batch Download Queue (v${VERSION})`);
    console.log(`  \x1B[90mBatch file:\x1B[0m ${batchFile}`);
    console.log(`  \x1B[90mTarget media:\x1B[0m \x1B[33m${choice}\x1B[0m`);
    if (outputDir) console.log(`  \x1B[90mOutput directory:\x1B[0m ${outputDir}`);
    if (limit) console.log(`  \x1B[90mPer-account limit:\x1B[0m ${limit}`);
    console.log();
    const controller = new AbortController();
    process.on("SIGINT", () => {
      console.log("\n[open-nami] Aborting batch queue\u2026");
      controller.abort();
    });
    try {
      const result = await runBatchQueue({
        filePath: batchFile,
        choice,
        defaultPlatform: cliPlatform || "instagram",
        outputDir,
        since,
        until,
        limit,
        resume: isResume,
        writeMetadata,
        signal: controller.signal,
        onAccountStart: (item, idx, total) => {
          console.log(`\x1B[36m[${idx + 1}/${total}]\x1B[0m \x1B[1m@${item.profile.username}\x1B[0m on \x1B[35m${item.profile.platform}\x1B[0m\u2026`);
        },
        onAccountProgress: (_item, progress) => {
          if (progress.currentFile) {
            process.stdout.write(`\r  \x1B[90m\u2192 [${progress.job}] ${progress.currentFile.slice(0, 60)}\x1B[0m\x1B[K`);
          }
        },
        onAccountComplete: (item) => {
          process.stdout.write("\r\x1B[K");
          console.log(`  \x1B[32m\u2713 @${item.profile.username}:\x1B[0m ${item.downloaded} downloaded, ${item.skipped} skipped
`);
        },
        onAccountError: (item, err) => {
          process.stdout.write("\r\x1B[K");
          console.error(`  \x1B[31m\u2717 @${item.profile.username || item.raw}:\x1B[0m ${err.message}
`);
        }
      });
      console.log(`\x1B[1mBatch completed:\x1B[0m ${result.succeeded} succeeded, ${result.failed} failed of ${result.total} total accounts.`);
      console.log(`\x1B[32mTotal media downloaded:\x1B[0m ${result.totalDownloaded} items (${result.totalSkipped} skipped).`);
      process.exit(result.failed > 0 ? 1 : 0);
    } catch (err) {
      console.error(`open-nami batch error: ${err.message || String(err)}`);
      process.exit(1);
    }
  }
  const isTTY = Boolean(process.stdout.isTTY);
  if (!isTTY && initialChoice && initialInput) {
    const parsed = parseProfileInput(initialInput);
    if (parsed.platform === "unknown" || !parsed.cleanUrl) {
      console.error(`open-nami: that doesn't look like a valid profile URL or username: ${initialInput}`);
      process.exit(1);
    }
    console.log(`[open-nami] downloading ${initialChoice} for @${parsed.username}\u2026`);
    try {
      const res = await dispatchDownload({
        profile: parsed,
        choice: initialChoice,
        outputDir,
        since,
        until,
        limit,
        resume: isResume,
        writeMetadata,
        onProgress: (progress) => {
          if (progress.currentFile) {
            console.log(`[open-nami] [${progress.job}] ${progress.currentFile}`);
          }
        }
      });
      console.log(`\u2713 downloaded ${res.downloadedCount} media items to ${res.outputDir}`);
      process.exit(res.success ? 0 : 1);
    } catch (err) {
      console.error(`open-nami error: ${err.message || String(err)}`);
      process.exit(1);
    }
  }
  if (isTTY) {
    enterAltScreen();
    process.on("exit", leaveAltScreen);
    for (const event of ["uncaughtException", "unhandledRejection"]) {
      process.on(event, (error) => {
        leaveAltScreen();
        console.error(error);
        process.exit(1);
      });
    }
  }
  try {
    const { waitUntilExit } = render(
      /* @__PURE__ */ jsx19(
        App,
        {
          initialInput,
          initialChoice,
          initialThemeMode: themeMode,
          outputDir,
          since,
          until,
          limit,
          resume: isResume,
          writeMetadata,
          version: VERSION
        }
      ),
      { stdout: captureFrames(process.stdout) }
    );
    await waitUntilExit();
  } finally {
    if (isTTY) leaveAltScreen();
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
export {
  VERSION,
  resolveVersion
};
