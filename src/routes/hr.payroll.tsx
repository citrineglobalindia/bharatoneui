// Payroll is deliberately not built yet.
//
// This route used to render a demo module listing five invented employees with
// salary figures against their names. On a screen labelled "Payroll" that is
// worse than an empty page: it looks like real data, and someone could act on
// it. It now states plainly what is missing and what is needed to build it.
import { createFileRoute } from "@tanstack/react-router";
import { WalletCards, ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { HrShell } from "@/components/hr/hr-shell";

export const Route = createFileRoute("/hr/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll — BharatOne HR" },
      { name: "description", content: "Salary processing, statutory contributions and claims." },
    ],
  }),
  component: Page,
});

const NEEDED = [
  "PF establishment code and the employer contribution rate you are registered for",
  "ESI code, and which employees fall under the wage ceiling",
  "Professional Tax rates for Karnataka and any other state you employ in",
  "TDS: declared investments per employee, and the regime each has chosen",
  "Salary structure — basic, HRA and allowances, as a percentage or a fixed amount",
];

function Page() {
  return (
    <HrShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <WalletCards className="h-5 w-5 text-india-green" /> Payroll
          </h2>
          <p className="text-sm text-muted-foreground">Not built yet — deliberately.</p>
        </div>

        <section className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <ShieldAlert className="h-4 w-4" /> Why this screen is empty
          </h3>
          <p className="mt-2 text-sm text-amber-900/90">
            Salary processing means PF, ESI, Professional Tax and TDS. Getting a rate
            wrong does not produce a wrong number on a screen — it produces a statutory
            liability, with interest, that surfaces months later at filing. Guessing
            those rates from general knowledge would be the wrong way to build this.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-bold">What is needed before it can be built</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Your chartered accountant will have all of these.
          </p>
          <ul className="mt-3 space-y-2">
            {NEEDED.map((n) => (
              <li key={n} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-india-green" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Once those are confirmed, payroll can be built on the employee records that
            already exist — no separate data entry.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-bold">In the meantime</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Attendance and approved leave for any month can be exported from Reports and
            handed to whoever runs your payroll today.
          </p>
          <Link to="/hr/reports"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-india-green px-4 py-2 text-sm font-bold text-white">
            Open Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </HrShell>
  );
}
