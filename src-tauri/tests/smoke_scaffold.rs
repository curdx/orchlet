use std::{collections::HashSet, fs, path::Path};

use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DesktopSmokeMatrix {
    schema_version: u32,
    required_flows: Vec<String>,
    platforms: Vec<SmokePlatform>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SmokePlatform {
    platform: String,
    runner: String,
    flows: Vec<SmokeFlow>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SmokeFlow {
    id: String,
    status: String,
    evidence: Option<String>,
    notes: String,
}

#[test]
fn desktop_smoke_matrix_covers_required_platform_flows() {
    let matrix = read_smoke_matrix();
    let required_platforms = ["windows", "macos", "linux"];
    let allowed_statuses = ["pass", "fail", "manual"]
        .into_iter()
        .collect::<HashSet<_>>();

    assert_eq!(matrix.schema_version, 1);

    for required_platform in required_platforms {
        let platform = matrix
            .platforms
            .iter()
            .find(|entry| entry.platform == required_platform)
            .unwrap_or_else(|| panic!("missing smoke platform {}", required_platform));

        assert!(!platform.runner.trim().is_empty());

        for required_flow in &matrix.required_flows {
            let flow = platform
                .flows
                .iter()
                .find(|entry| entry.id == *required_flow)
                .unwrap_or_else(|| {
                    panic!(
                        "missing smoke flow {} for {}",
                        required_flow, required_platform
                    )
                });

            assert!(allowed_statuses.contains(flow.status.as_str()));
            assert_ne!(
                flow.status, "fail",
                "smoke matrix contains a blocking failure"
            );
            assert!(flow.evidence.as_deref().unwrap_or("").is_empty());
            assert!(!flow.notes.trim().is_empty());
        }
    }
}

fn read_smoke_matrix() -> DesktopSmokeMatrix {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../fixtures/smoke/desktop-smoke-matrix.json");
    let raw = fs::read_to_string(&path).unwrap_or_else(|error| {
        panic!("failed to read smoke matrix {}: {}", path.display(), error);
    });

    serde_json::from_str(&raw).unwrap_or_else(|error| {
        panic!(
            "failed to deserialize smoke matrix {}: {}",
            path.display(),
            error
        );
    })
}
