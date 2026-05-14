import { describe, expect, it } from "vitest";

import { CAPABILITY_STATUSES, CAPABILITY_STATUS_META, capabilityStatusMeta } from "./status";

describe("capability status metadata", () => {
  it("defines labels for all supported capability states", () => {
    expect([...CAPABILITY_STATUSES].sort()).toEqual(["abandoned", "alternative", "implemented", "placeholder"]);
    expect(Object.keys(CAPABILITY_STATUS_META).sort()).toEqual([...CAPABILITY_STATUSES].sort());
    expect(capabilityStatusMeta("implemented").label).toBe("已实现");
    expect(capabilityStatusMeta("alternative").label).toBe("替代实现");
    expect(capabilityStatusMeta("placeholder").label).toBe("占位");
    expect(capabilityStatusMeta("abandoned").label).toBe("明确放弃");
  });
});
