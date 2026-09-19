"use client";

const nodes = [
  {
    name: "Frontend Control Room",
    tech: "React 19 + Vite + Tailwind CSS",
    status: "Implemented",
    detail: "Real-time operations dashboard connected to backend state. Zero fake metrics.",
  },
  {
    name: "API Gateway",
    tech: "AWS HTTP API (CDK)",
    status: "Tested / CDK Spec",
    detail: "CDK synthesized with GET /health, POST /runs, GET /runs/{runId}. Local dev runs @fuse/api.",
  },
  {
    name: "Lambda Execution Handlers",
    tech: "Node.js 22.x Runtime",
    status: "Tested / CDK Spec",
    detail: "Synthesized in CDK stack. Local execution executes the synthetic runner.",
  },
  {
    name: "Fuse Enforcement Layer",
    tech: "beforeCall() Policy Gate",
    status: "Implemented & Tested",
    detail: "Guarantees that a denied decision prevents the underlying model or tool from executing.",
  },
  {
    name: "DynamoDB Repositories",
    tech: "Runs & Events Tables",
    status: "Tested / CDK Spec",
    detail: "Repositories tested against in-memory store and fake document client. Terminal runs are immutable.",
  },
  {
    name: "EventBridge Event Bus",
    tech: "BreakerTripped Event Emitter",
    status: "Implemented & Tested",
    detail: "Event payload schema validated with Zod. Fires BreakerTripped on policy violation.",
  },
  {
    name: "CloudWatch",
    tech: "Log Groups & Metrics",
    status: "Planned / CDK Spec",
    detail: "Log groups synthesized in CDK infrastructure definition.",
  },
  {
    name: "Amazon Bedrock Converse",
    tech: "Foundation Model API",
    status: "Pending AWS Verification",
    detail: "Model listing and IAM verified; Converse refused due to pending AWS account verification.",
  },
];

const tone: Record<string, { badge: string; border: string }> = {
  Implemented: {
    badge: "text-completed bg-completed/10 border-completed/30",
    border: "border-completed/30 hover:border-completed/60",
  },
  "Implemented & Tested": {
    badge: "text-completed bg-completed/10 border-completed/30",
    border: "border-completed/30 hover:border-completed/60",
  },
  "Tested / CDK Spec": {
    badge: "text-active bg-active/10 border-active/30",
    border: "border-active/30 hover:border-active/60",
  },
  Planned: {
    badge: "text-muted bg-[#15243A] border-border/40",
    border: "border-border hover:border-border-strong",
  },
  "Planned / CDK Spec": {
    badge: "text-muted bg-[#15243A] border-border/40",
    border: "border-border hover:border-border-strong",
  },
  "Pending AWS Verification": {
    badge: "text-running bg-running/10 border-running/30",
    border: "border-running/30 hover:border-running/60",
  },
};

export function ArchitectureDiagram() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {nodes.map((node, index) => {
        const theme = tone[node.status] ?? {
          badge: "text-muted bg-[#15243A] border-border/40",
          border: "border-border",
        };
        return (
          <li
            key={node.name}
            className={`rounded-[14px] border bg-[#0D1626] p-5 flex flex-col justify-between transition-all duration-160 ${theme.border}`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-muted font-bold">
                  Stage {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${theme.badge}`}
                >
                  {node.status}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-text">{node.name}</h3>
              <p className="font-mono text-[11px] text-active/80 mt-1">{node.tech}</p>
              <p className="mt-3 text-xs text-text-secondary leading-relaxed font-sans">
                {node.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
