export type CapabilityStatus = "implemented" | "alternative" | "placeholder" | "abandoned";

export const CAPABILITY_STATUSES = [
  "implemented",
  "alternative",
  "placeholder",
  "abandoned",
] as const satisfies readonly CapabilityStatus[];

export type CapabilityStatusMeta = {
  label: string;
  tone: "success" | "info" | "warning" | "muted";
  description: string;
};

export type CapabilityStatusEvidence = {
  kind: "story" | "requirement" | "test" | "fixture" | "script" | "decision" | "doc";
  reference: string;
  path?: string;
};

export type CapabilityStatusEntry = {
  id: string;
  domain: string;
  title: string;
  status: CapabilityStatus;
  reason: string;
  userFacingState?: string;
  decisionReason?: string;
  evidence: CapabilityStatusEvidence[];
};

export const CAPABILITY_STATUS_META: Record<CapabilityStatus, CapabilityStatusMeta> = {
  implemented: {
    label: "已实现",
    tone: "success",
    description: "当前 MVP 中已实现并有验证证据。",
  },
  alternative: {
    label: "替代实现",
    tone: "info",
    description: "旧版能力由新版等价能力替代。",
  },
  placeholder: {
    label: "占位",
    tone: "warning",
    description: "界面可见但 MVP 中尚未启用。",
  },
  abandoned: {
    label: "明确放弃",
    tone: "muted",
    description: "经产品边界确认不进入当前 MVP。",
  },
};

export function capabilityStatusMeta(status: CapabilityStatus): CapabilityStatusMeta {
  return CAPABILITY_STATUS_META[status];
}
