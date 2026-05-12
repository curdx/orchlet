import type {
  DataIntegrityCheckResult,
  DataIntegrityReport,
  DataIntegritySeverity,
  DataIntegrityStatus,
  StorageCategory,
  WorkspaceMetadata,
} from "../../src/contracts/generated";

import failedRegistryReport from "../../fixtures/data-integrity/reports/failed-registry-report.json";
import passedReport from "../../fixtures/data-integrity/reports/passed-report.json";
import workspaceMetadata from "../../fixtures/schema/valid-workspace/.orchlet/workspace.json";

export const workspaceMetadataFixture: WorkspaceMetadata = workspaceMetadata;
export const passedDataIntegrityReportFixture: DataIntegrityReport =
  dataIntegrityReport(passedReport);
export const failedRegistryDataIntegrityReportFixture: DataIntegrityReport =
  dataIntegrityReport(failedRegistryReport);

type ReportJson = typeof passedReport | typeof failedRegistryReport;
type CheckJson = (typeof passedReport.checks)[number] | (typeof failedRegistryReport.checks)[number];

function dataIntegrityReport(report: ReportJson): DataIntegrityReport {
  return {
    ...report,
    checks: report.checks.map(dataIntegrityCheckResult),
  };
}

function dataIntegrityCheckResult(check: CheckJson): DataIntegrityCheckResult {
  return {
    ...check,
    category: storageCategory(check.category),
    status: dataIntegrityStatus(check.status),
    severity: dataIntegritySeverity(check.severity),
  };
}

function storageCategory(value: string): StorageCategory {
  switch (value) {
    case "storageManifest":
    case "workspaceMetadata":
    case "workspaceRegistry":
    case "workspaceFallbacks":
    case "memberProfiles":
    case "contactProfiles":
    case "conversationRecords":
    case "conversationMembers":
    case "messageRecords":
    case "messageMentions":
    case "conversationReadPositions":
    case "privateConversations":
    case "terminalTabs":
      return value;
    default:
      throw new Error(`Unknown storage category: ${value}`);
  }
}

function dataIntegrityStatus(value: string): DataIntegrityStatus {
  switch (value) {
    case "passed":
    case "failed":
    case "skipped":
      return value;
    default:
      throw new Error(`Unknown data integrity status: ${value}`);
  }
}

function dataIntegritySeverity(value: string): DataIntegritySeverity {
  switch (value) {
    case "info":
    case "warning":
    case "error":
      return value;
    default:
      throw new Error(`Unknown data integrity severity: ${value}`);
  }
}
