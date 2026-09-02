import type { AgentSpec } from "@/agents/registry";

export function AgentCard({
  spec,
  configured,
  children,
}: {
  spec: AgentSpec;
  configured: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass print-avoid-break relative overflow-hidden rounded-2xl p-5">
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: spec.accent }}
      />

      <div className="flex items-start gap-3">
        <span
          className="mono flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
          style={{ background: spec.accent }}
        >
          {spec.number}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[15.5px] font-bold tracking-tight">
              {spec.name}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
              style={{
                background: configured ? "var(--brand-100)" : "var(--surface-3)",
                color: configured ? "var(--brand-800)" : "var(--text-subtle)",
              }}
            >
              {configured ? "Ready" : "Needs key"}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-muted">{spec.role}</p>
        </div>
      </div>

      <p className="mt-3.5 text-[12.5px] leading-relaxed text-muted">
        <span className="font-semibold text-ink">Why an agent. </span>
        {spec.why}
      </p>

      <div
        className="mt-3 rounded-xl px-3.5 py-3 text-[11.5px] leading-relaxed"
        style={{ background: "var(--surface-2)" }}
      >
        <span className="font-semibold text-ink">Guardrail. </span>
        <span className="text-muted">{spec.guardrail}</span>
      </div>

      {spec.tools.length > 0 ? (
        <div className="mt-3">
          <div className="eyebrow mb-1.5">Tools</div>
          <div className="flex flex-wrap gap-1">
            {spec.tools.map((t) => (
              <span
                key={t}
                className="mono rounded-md bg-surface-2 px-1.5 py-1 text-[10px] text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <div className="eyebrow mb-1.5">Tools</div>
          <span className="text-[11.5px] text-subtle">
            None by design — it may only rephrase what it is handed.
          </span>
        </div>
      )}

      {children && <div className="mt-4 border-t border-line pt-4">{children}</div>}
    </div>
  );
}
