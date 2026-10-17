import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { countryByCode } from "~/data";
import { planPath, toQuery } from "~/lib/settings";
import { loadPlans, type SavedPlan, savePlans } from "~/lib/storage";
import { Mascot, moodFor } from "./Mascot";

function href(p: SavedPlan): string {
  const q = toQuery(p.settings).toString();
  return `${planPath(p.settings.country, p.settings.year)}${q ? `?${q}` : ""}`;
}

export default function SavedPlans() {
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => setPlans(loadPlans()), []);

  const update = (next: SavedPlan[]) => {
    setPlans(next);
    savePlans(next);
  };

  if (plans === null) return <div className="card h-40 animate-pulse" />;

  if (plans.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <Mascot size={88} mood="sleepy" title="" />
        <h2 className="text-2xl font-bold">No saved plans yet</h2>
        <p className="max-w-md text-muted">
          Build a plan you like, then press <strong>Save plan</strong>. It's kept in this browser, so you can
          come back and compare.
        </p>
        <a href="/" className="btn btn-primary">
          Start planning
        </a>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => {
        const c = countryByCode.get(p.settings.country);
        return (
          <li key={p.id} className="card flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <Mascot size={40} mood={moodFor(p.summary.multiplier, p.summary.leaveUsed)} title="" />
              <div className="min-w-0 flex-1">
                {editing === p.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const name = new FormData(e.currentTarget).get("name")?.toString().trim();
                      if (name) update(plans.map((x) => (x.id === p.id ? { ...x, name } : x)));
                      setEditing(null);
                    }}
                  >
                    <label htmlFor={`name-${p.id}`} className="sr-only">
                      Plan name
                    </label>
                    <input
                      id={`name-${p.id}`}
                      name="name"
                      defaultValue={p.name}
                      ref={(el) => el?.focus()}
                      maxLength={60}
                      className="input py-1.5"
                      onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                    />
                  </form>
                ) : (
                  <h2 className="truncate text-lg font-bold">{p.name}</h2>
                )}
                <p className="text-sm text-muted">
                  {c?.flag} {p.summary.place} · {p.summary.yearLabel}
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between rounded-2xl bg-hero p-4 text-hero-ink">
              <div>
                <p className="font-display text-2xl font-extrabold leading-tight">
                  {p.summary.leaveUsed} → <span className="text-lime">{p.summary.daysOff} days off</span>
                </p>
                <p className="text-xs text-hero-muted">Saved {new Date(p.savedAt).toLocaleDateString()}</p>
              </div>
              <span className="rounded-full bg-lime px-2.5 py-1 font-display font-extrabold text-lime-ink">
                {p.summary.multiplier.toFixed(1)}×
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a href={href(p)} className="btn btn-primary flex-1">
                Open <ArrowRight size={16} />
              </a>
              <button
                type="button"
                className="btn btn-soft px-3"
                aria-label={`Rename ${p.name}`}
                onClick={() => setEditing(p.id)}
              >
                <Pencil size={16} />
              </button>
              {confirm === p.id ? (
                <button
                  type="button"
                  className="btn bg-red px-3 text-white"
                  onClick={() => {
                    update(plans.filter((x) => x.id !== p.id));
                    setConfirm(null);
                  }}
                >
                  Delete?
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-soft px-3"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => setConfirm(p.id)}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
