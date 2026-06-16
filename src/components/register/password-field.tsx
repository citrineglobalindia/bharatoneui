import { useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { inputCls } from "./field";
import { cn } from "@/lib/utils";

export type PasswordCriteria = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

export function evaluatePassword(value: string): PasswordCriteria {
  return {
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value),
  };
}

export function isPasswordValid(value: string) {
  const c = evaluatePassword(value);
  return c.length && c.upper && c.lower && c.number && c.special;
}

export function PasswordField({
  value,
  onChange,
  placeholder = "Create a strong password",
  showCriteria = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showCriteria?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hoverEye, setHoverEye] = useState(false);
  const c = evaluatePassword(value);
  const open = showCriteria && (focused || hoverEye || (value.length > 0 && !isPasswordValid(value)));

  return (
    <div className="relative">
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`${inputCls} pr-10`}
          placeholder={placeholder}
          autoComplete="new-password"
          aria-describedby="password-criteria"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          onMouseEnter={() => setHoverEye(true)}
          onMouseLeave={() => setHoverEye(false)}
          onFocus={() => setHoverEye(true)}
          onBlur={() => setHoverEye(false)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div
          id="password-criteria"
          role="tooltip"
          className="absolute z-30 right-0 mt-2 w-72 rounded-xl border border-border bg-popover p-3 shadow-elev animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div
            aria-hidden
            className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-border bg-popover"
          />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Password must contain
          </p>
          <ul className="mt-2 space-y-1.5">
            <Rule ok={c.length} label="At least 8 characters" />
            <Rule ok={c.upper} label="At least one uppercase letter (A-Z)" />
            <Rule ok={c.lower} label="At least one lowercase letter (a-z)" />
            <Rule ok={c.number} label="At least one number (0-9)" />
            <Rule ok={c.special} label="At least one special character (!@#$…)" />
          </ul>
        </div>
      )}
    </div>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 text-xs font-medium transition-colors",
        ok ? "text-india-green" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1",
          ok
            ? "bg-india-green/10 text-india-green ring-india-green/30"
            : "bg-muted text-muted-foreground ring-border",
        )}
      >
        {ok ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      {label}
    </li>
  );
}

export function ConfirmPasswordField({
  value,
  onChange,
  original,
  placeholder = "Re-enter password",
}: {
  value: string;
  onChange: (v: string) => void;
  original: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const mismatch = value.length > 0 && value !== original;
  const match = value.length > 0 && value === original;
  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            `${inputCls} pr-10`,
            mismatch && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/15",
            match && "border-india-green/60 focus-visible:border-india-green",
          )}
          autoComplete="new-password"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {mismatch && (
        <p className="mt-1 text-[11px] font-medium text-red-600">Passwords do not match.</p>
      )}
      {match && (
        <p className="mt-1 text-[11px] font-medium text-india-green">Passwords match.</p>
      )}
    </div>
  );
}