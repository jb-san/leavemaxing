import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { countryByCode } from "~/data";
import { planPath, toQuery } from "~/lib/settings";
import { loadPlans, type SavedPlan, savePlans } from "~/lib/storage";
import { forgetGroup, listMemberships, type Membership } from "~/lib/together/store";
import { GroupCard } from "./GroupPlans";
import { Mascot, moodFor } from "./Mascot";

function href(p: SavedPlan): string {
  const q = toQuery(p.settings).toString();
  return `${planPath(p.settings.country, p.settings.year)}${q ? `?${q}` : ""}`;
}

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

export default function SavedPlans() {
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [groups, setGroups] = useState<Membership[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPlans(loadPlans());
    setGroups(listMemberships());
  }, []);

  const update = (next: SavedPlan[]) => {
    setPlans(next);
    savePlans(next);
  };

  const Title = groups.length > 0 ? "h3" : "h2";
  const solo =
    plans === null ? null : plans.length === 0 ? (
      groups.length > 0 ? (
        <p className="text-muted">
          No saved plans of your own yet.{" "}
          <a href="/" className="font-semibold text-ink underline underline-offset-2">
            Start planning
          </a>
        </p>
      ) : (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <Mascot size={88} mood="sleepy" title="" />
          <h2 className="text-2xl font-bold">No saved plans yet</h2>
          <p className="max-w-md text-muted">
            Build a plan you like, then press <strong>Save plan</strong>. It's kept in this browser, so you
            can come back and compare.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a href="/" className="btn btn-primary">
              Start planning
            </a>
            <a href="/together/" className="btn btn-soft">
              Plan with friends
            </a>
          </div>
        </div>
      )
    ) : (
      <ul className={GRID}>
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
                    <Title className="truncate text-lg font-bold">{p.name}</Title>
                  )}
                  <p className="text-sm text-muted">
                    {c?.flag} {p.summary.place}, {p.summary.yearLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between rounded-2xl bg-hero p-4 text-hero-ink">
                <div>
                  <p className="font-display text-2xl font-extrabold leading-tight">
                    <span className="text-lime">{p.summary.leaveUsed} leave days</span>
                    <br />
                    {p.summary.daysOff} days off
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

  return (
    <div ref={top} tabIndex={-1} className="flex flex-col gap-8 outline-none">
      <div className="flex flex-col gap-2 pb-0 pt-2">
        <h1 className="text-[clamp(32px,4.4vw,52px)] font-extrabold leading-none">My plans</h1>
        <p className="text-muted">
          {groups.length > 0
            ? "Kept in this browser. Group plans are shared with your group, encrypted."
            : "Kept in this browser. Nothing is uploaded."}
        </p>
      </div>
      {plans === null && <div className="card h-40 animate-pulse" />}
      {groups.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="group-plans">
          <h2 id="group-plans" className="text-xl font-bold">
            Group plans
          </h2>
          <ul className={GRID}>
            {groups.map((m) => (
              <GroupCard
                key={m.groupId}
                m={m}
                confirming={confirmGroup === m.groupId}
                onAsk={() => setConfirmGroup(m.groupId)}
                onCancel={() => setConfirmGroup(null)}
                onRemove={() => {
                  forgetGroup(m.groupId);
                  setGroups(groups.filter((x) => x.groupId !== m.groupId));
                  setConfirmGroup(null);
                  top.current?.focus();
                }}
              />
            ))}
          </ul>
          {solo && plans?.length === 0 && solo}
        </section>
      )}
      {solo && !(groups.length > 0 && plans?.length === 0) && (
        <section
          className="flex flex-col gap-4"
          aria-labelledby={groups.length > 0 ? "your-plans" : undefined}
        >
          {groups.length > 0 && (
            <h2 id="your-plans" className="text-xl font-bold">
              Your plans
            </h2>
          )}
          {solo}
        </section>
      )}
    </div>
  );
}
