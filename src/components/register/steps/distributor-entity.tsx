import { useState } from "react";
import {
  User,
  Building2,
  UserCog,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Briefcase,
  IdCard,
  Globe,
  Hash,
} from "lucide-react";
import { Field, inputCls, SectionCard, StepHeader, Notice } from "../field";
import { cn } from "@/lib/utils";

type EntityType = "individual" | "organisation";

export function DistributorEntityStep() {
  const [entity, setEntity] = useState<EntityType>("individual");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [orgType, setOrgType] = useState("pvt_ltd");

  return (
    <div className="space-y-6">
      <StepHeader
        icon={<User className="h-5 w-5" />}
        title="Distributor Profile"
        description="Tell us whether you're registering as an Individual or on behalf of an Organisation."
      />

      {/* Entity selector — segmented cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <EntityCard
          active={entity === "individual"}
          onClick={() => setEntity("individual")}
          icon={<User className="h-5 w-5" />}
          title="Individual"
          subtitle="Sole proprietor / personal distributor"
        />
        <EntityCard
          active={entity === "organisation"}
          onClick={() => setEntity("organisation")}
          icon={<Building2 className="h-5 w-5" />}
          title="Organisation"
          subtitle="Company, LLP, Firm or Society"
        />
      </div>

      {entity === "individual" ? (
        <SectionCard title="Personal Details" icon={<User className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="First Name" required>
              <input className={inputCls} placeholder="First name" />
            </Field>
            <Field label="Middle Name">
              <input className={inputCls} placeholder="Middle name (optional)" />
            </Field>
            <Field label="Surname" required>
              <input className={inputCls} placeholder="Surname" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of Birth" required>
              <input type="date" className={inputCls} />
            </Field>
            <Field label="Gender" required>
              <select className={inputCls} defaultValue="">
                <option value="" disabled>Select gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="PAN Number" required icon={<IdCard className="h-4 w-4" />}>
              <input className={`${inputCls} uppercase`} placeholder="ABCDE1234F" maxLength={10} />
            </Field>
            <Field label="Aadhaar Number" required>
              <input className={inputCls} placeholder="XXXX XXXX XXXX" maxLength={14} />
            </Field>
          </div>
          <PasswordPair
            show1={show1} show2={show2}
            setShow1={setShow1} setShow2={setShow2}
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Organisation Details" icon={<Building2 className="h-5 w-5" />}>
            <Field label="Organisation / Firm Name" required>
              <input className={inputCls} placeholder="Registered legal name" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organisation Type" required icon={<Briefcase className="h-4 w-4" />}>
                <select
                  className={inputCls}
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                >
                  <option value="pvt_ltd">Private Limited (Pvt Ltd)</option>
                  <option value="public_ltd">Public Limited</option>
                  <option value="llp">LLP</option>
                  <option value="partnership">Partnership Firm</option>
                  <option value="proprietorship">Proprietorship</option>
                  <option value="society">Society / Trust</option>
                  <option value="huf">HUF</option>
                </select>
              </Field>
              <Field label="Date of Incorporation" required>
                <input type="date" className={inputCls} />
              </Field>
              <Field label="Organisation PAN" required icon={<IdCard className="h-4 w-4" />}>
                <input className={`${inputCls} uppercase`} placeholder="AAACX1234F" maxLength={10} />
              </Field>
              <Field label="CIN / Registration No." required icon={<Hash className="h-4 w-4" />}>
                <input className={`${inputCls} uppercase`} placeholder="U12345KA2020PTC123456" />
              </Field>
              <Field label="GSTIN" required>
                <input className={`${inputCls} uppercase`} placeholder="29ABCDE1234F1Z5" maxLength={15} />
              </Field>
              <Field label="Website" icon={<Globe className="h-4 w-4" />}>
                <input className={inputCls} placeholder="https://example.com" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Authorised Representative" icon={<UserCog className="h-5 w-5" />}>
            <Notice tone="info" title="Who is this?">
              The representative is the person legally authorised to operate this distributor account on
              behalf of the organisation. Their KYC will be verified.
            </Notice>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="First Name" required>
                <input className={inputCls} placeholder="First name" />
              </Field>
              <Field label="Middle Name">
                <input className={inputCls} placeholder="Middle name (optional)" />
              </Field>
              <Field label="Surname" required>
                <input className={inputCls} placeholder="Surname" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Designation" required>
                <input className={inputCls} placeholder="e.g. Director, Partner, Manager" />
              </Field>
              <Field label="Date of Birth" required>
                <input type="date" className={inputCls} />
              </Field>
              <Field label="Representative PAN" required icon={<IdCard className="h-4 w-4" />}>
                <input className={`${inputCls} uppercase`} placeholder="ABCDE1234F" maxLength={10} />
              </Field>
              <Field label="Aadhaar Number" required>
                <input className={inputCls} placeholder="XXXX XXXX XXXX" maxLength={14} />
              </Field>
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <input type="email" className={inputCls} placeholder="rep@company.com" />
              </Field>
              <Field label="Mobile" icon={<Phone className="h-4 w-4" />}>
                <input className={inputCls} placeholder="10 digit mobile" maxLength={10} />
              </Field>
            </div>
            <PasswordPair
              show1={show1} show2={show2}
              setShow1={setShow1} setShow2={setShow2}
            />
          </SectionCard>
        </>
      )}

      <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground space-y-1">
        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email: <span className="text-foreground font-medium">sada@gmail.com</span></div>
        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Mobile: <span className="text-foreground font-medium">+91 8652468799</span></div>
      </div>
    </div>
  );
}

function EntityCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative flex items-start gap-3 rounded-2xl border bg-card p-4 text-left shadow-soft transition-all",
        active
          ? "border-primary ring-4 ring-primary/15 bg-primary/[0.04]"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
          active ? "bg-saffron-gradient text-white shadow-elev" : "bg-muted text-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[15px] font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{subtitle}</span>
      </span>
      <span
        className={cn(
          "absolute right-3 top-3 h-4 w-4 rounded-full border-2 transition-colors",
          active ? "border-primary bg-primary" : "border-border bg-background",
        )}
      />
    </button>
  );
}

function PasswordPair({
  show1, show2, setShow1, setShow2,
}: {
  show1: boolean; show2: boolean;
  setShow1: (v: boolean | ((p: boolean) => boolean)) => void;
  setShow2: (v: boolean | ((p: boolean) => boolean)) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Password" required>
        <div className="relative">
          <input
            type={show1 ? "text" : "password"}
            className={`${inputCls} pr-10`}
            placeholder="Min 6 characters"
          />
          <button
            type="button"
            onClick={() => setShow1((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <Field label="Confirm Password" required>
        <div className="relative">
          <input
            type={show2 ? "text" : "password"}
            className={`${inputCls} pr-10`}
            placeholder="Re-enter password"
          />
          <button
            type="button"
            onClick={() => setShow2((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
    </div>
  );
}