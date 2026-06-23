import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Loader2,
  CheckCircle2,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  AtSign,
  Link as LinkIcon,
  FileText,
  GraduationCap,
  Building2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type JobMeta = { id: string; title: string; team?: string };

type FormState = "idle" | "submitting" | "success" | "error";

export function ApplyDialog({
  open,
  onClose,
  job,
}: {
  open: boolean;
  onClose: () => void;
  job: JobMeta | null;
}) {
  const [state, setState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Reset form when dialog opens for a new job
  useEffect(() => {
    if (open) {
      setState("idle");
      setErrors({});
      setResumeFile(null);
    }
  }, [open, job?.id]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!job) return;
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => fd.get(k)?.toString().trim() ?? "";

    const nextErrors: Record<string, string> = {};
    if (!get("full_name")) nextErrors.full_name = "Please tell us your name";
    const email = get("email");
    if (!email) nextErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Invalid email";
    if (!get("phone")) nextErrors.phone = "Phone is required";
    if (!resumeFile) nextErrors.resume = "Please attach your resume (PDF or DOCX)";
    if (resumeFile) {
      if (resumeFile.size > 10 * 1024 * 1024)
        nextErrors.resume = "Resume must be under 10 MB";
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(resumeFile.type))
        nextErrors.resume = "Please upload a PDF or DOCX file";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setState("submitting");
    // Job application capture will be wired to the portal backend later.
    setTimeout(() => setState("success"), 500);
  };

  return (
    <AnimatePresence>
      {open && job && (
        <motion.div
          key="apply"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
            onClick={() => state !== "submitting" && onClose()}
          />
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-card border border-border w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-elegant"
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: "var(--gradient-tricolor)" }}
            />
            {/* Header */}
            <header className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-border">
              <div className="flex items-start gap-3 min-w-0">
                <div className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-[var(--saffron)] to-[var(--india-green)] text-white flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Apply for
                  </div>
                  <div className="font-display text-lg sm:text-xl font-bold truncate">
                    {job.title}
                  </div>
                  {job.team && (
                    <div className="text-xs text-muted-foreground">{job.team} · BharatOne</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => state !== "submitting" && onClose()}
                className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {state === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -8, 0] }}
                    transition={{ type: "spring", stiffness: 220, damping: 14 }}
                    className="mx-auto h-16 w-16 rounded-full bg-india-green/15 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-9 w-9 text-india-green" />
                  </motion.div>
                  <h3 className="font-display text-2xl font-bold mt-5">Application received!</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    Thanks for applying to <strong>{job.title}</strong>. Our team will review your
                    application and get back to you within 5 business days.
                  </p>
                  <Button className="mt-6" onClick={onClose}>
                    Close
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Personal */}
                  <Section title="Personal information" icon={Mail}>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field id="full_name" label="Full name" error={errors.full_name}>
                        <Input id="full_name" name="full_name" placeholder="Your name" required />
                      </Field>
                      <Field id="email" label="Email" error={errors.email}>
                        <Input id="email" name="email" type="email" placeholder="you@example.com" required />
                      </Field>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field id="phone" label="Phone" error={errors.phone}>
                        <Input id="phone" name="phone" type="tel" placeholder="+91 …" required />
                      </Field>
                      <Field id="location" label="Current location">
                        <Input id="location" name="location" placeholder="City, State" />
                      </Field>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field id="linkedin_url" label="LinkedIn (optional)">
                        <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input id="linkedin_url" name="linkedin_url" type="url" placeholder="https://linkedin.com/in/…" className="pl-9" />
                        </div>
                      </Field>
                      <Field id="portfolio_url" label="Portfolio / Website (optional)">
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input id="portfolio_url" name="portfolio_url" type="url" placeholder="https://…" className="pl-9" />
                        </div>
                      </Field>
                    </div>
                  </Section>

                  {/* Experience */}
                  <Section title="Work experience" icon={Building2}>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <Field id="total_experience_years" label="Total years">
                        <Input
                          id="total_experience_years"
                          name="total_experience_years"
                          type="number"
                          min={0}
                          step={0.5}
                          placeholder="e.g. 3.5"
                        />
                      </Field>
                      <Field id="current_position" label="Current role" className="sm:col-span-1">
                        <Input id="current_position" name="current_position" placeholder="e.g. Senior Engineer" />
                      </Field>
                      <Field id="current_company" label="Current company" className="sm:col-span-1">
                        <Input id="current_company" name="current_company" placeholder="e.g. Acme Inc." />
                      </Field>
                    </div>
                    <Field id="experience" label="Highlight your experience">
                      <Textarea
                        id="experience"
                        name="experience"
                        rows={4}
                        placeholder="Share key roles, achievements, technologies, scale of impact…"
                      />
                    </Field>
                  </Section>

                  {/* Education */}
                  <Section title="Education" icon={GraduationCap}>
                    <Field id="education" label="Education details">
                      <Textarea
                        id="education"
                        name="education"
                        rows={3}
                        placeholder="Degree(s), institution(s), year(s) of graduation, GPA if relevant"
                      />
                    </Field>
                  </Section>

                  {/* Resume */}
                  <Section title="Resume" icon={FileText}>
                    <Field id="resume" label="Upload resume (PDF or DOCX, ≤10 MB)" error={errors.resume}>
                      <label
                        htmlFor="resume"
                        className={`flex items-center justify-between gap-3 rounded-md border-2 border-dashed px-4 py-4 cursor-pointer transition-colors ${
                          resumeFile
                            ? "border-india-green/50 bg-india-green/5"
                            : "border-border hover:border-saffron/40 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                              resumeFile
                                ? "bg-india-green/15 text-india-green"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {resumeFile ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {resumeFile ? resumeFile.name : "Click to choose a file"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {resumeFile
                                ? `${(resumeFile.size / 1024).toFixed(0)} KB`
                                : "PDF or DOCX, up to 10 MB"}
                            </div>
                          </div>
                        </div>
                        <input
                          id="resume"
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                      </label>
                    </Field>
                  </Section>

                  {/* Cover letter */}
                  <Section title="Anything else?" icon={Mail}>
                    <Field id="cover_letter" label="Cover letter / Why you'd be a great fit (optional)">
                      <Textarea
                        id="cover_letter"
                        name="cover_letter"
                        rows={4}
                        placeholder="Tell us why you're excited about BharatOne and this role…"
                      />
                    </Field>
                  </Section>

                  {errors.form && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-destructive/30 bg-destructive/8 text-destructive text-sm px-3 py-2"
                    >
                      {errors.form}
                    </motion.div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={state === "submitting"}
                      className="flex-1 bg-gradient-to-r from-[var(--saffron)] to-[var(--india-green)] text-white"
                    >
                      {state === "submitting" ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting
                        </>
                      ) : (
                        <>
                          <Send className="mr-1.5 h-4 w-4" /> Submit application
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose} disabled={state === "submitting"}>
                      Cancel
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    By submitting, you consent to BharatOne processing your information for hiring purposes.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className="h-3.5 w-3.5 text-saffron" />
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
