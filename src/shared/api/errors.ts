import type { AppError } from "../../contracts/generated/common";

function hasAppErrorShape(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    "severity" in value &&
    "recoverable" in value
  );
}

export function normalizeAppError(error: unknown): AppError {
  if (hasAppErrorShape(error)) {
    return error;
  }

  if (typeof error === "string") {
    return {
      code: "ipc.error.string",
      message: error,
      severity: "error",
      recoverable: true,
      userAction: "请重试；如果问题持续，请查看诊断信息。",
      details: null,
      correlationId: null,
    };
  }

  return {
    code: "ipc.error.unknown",
    message: "桌面能力调用失败。",
    severity: "error",
    recoverable: true,
    userAction: "请重试；如果问题持续，请查看诊断信息。",
    details: null,
    correlationId: null,
  };
}
