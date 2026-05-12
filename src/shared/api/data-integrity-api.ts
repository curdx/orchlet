import type {
  DataIntegrityValidateRequest,
  DataIntegrityValidateResult,
} from "../../contracts/generated/data_integrity";
import { invokeCommand } from "./client";

export type DataIntegrityApi = {
  validate: (
    request?: Partial<DataIntegrityValidateRequest>,
  ) => Promise<DataIntegrityValidateResult>;
};

export const dataIntegrityApi: DataIntegrityApi = {
  validate(request = {}) {
    return invokeCommand<DataIntegrityValidateResult>("data_integrity_validate", {
      request: {
        workspaceRoot: request.workspaceRoot ?? null,
      },
    });
  },
};
