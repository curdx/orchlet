use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "common.ts")]
pub enum AppErrorSeverity {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "common.ts")]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub severity: AppErrorSeverity,
    pub recoverable: bool,
    pub user_action: Option<String>,
    pub details: Option<String>,
    pub correlation_id: Option<String>,
}

impl AppError {
    pub fn recoverable_error(
        code: impl Into<String>,
        message: impl Into<String>,
        user_action: impl Into<String>,
        details: Option<String>,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            severity: AppErrorSeverity::Error,
            recoverable: true,
            user_action: Some(user_action.into()),
            details,
            correlation_id: None,
        }
    }

    pub fn recoverable_warning(
        code: impl Into<String>,
        message: impl Into<String>,
        user_action: impl Into<String>,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            severity: AppErrorSeverity::Warning,
            recoverable: true,
            user_action: Some(user_action.into()),
            details: None,
            correlation_id: None,
        }
    }
}
