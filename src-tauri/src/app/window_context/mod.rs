use std::{
    collections::HashMap,
    sync::{Mutex, MutexGuard},
    time::{SystemTime, UNIX_EPOCH},
};

use crate::contracts::{
    AppLanguage, AppPreferencesSnapshot, AppTheme, OpenedWorkspace, RegisteredWindow,
    WindowContextSnapshot, WindowMode,
};

pub const WINDOW_CONTEXT_SCHEMA_VERSION: u32 = 1;
pub const WINDOW_CONTEXT_CHANGED_EVENT: &str = "window-context-changed";
pub const APP_PREFERENCES_CHANGED_EVENT: &str = "app-preferences-changed";

#[derive(Default)]
pub struct WindowContextRuntimeState {
    inner: Mutex<WindowContextState>,
}

impl WindowContextRuntimeState {
    pub fn snapshot_for(&self, window: RegisteredWindow) -> WindowContextSnapshot {
        self.context().snapshot_for(window, None)
    }

    pub fn register_window(&self, window: RegisteredWindow) -> WindowContextSnapshot {
        let mut context = self.context();
        context
            .registered_windows
            .insert(window.label.clone(), window.mode.clone());
        context.touch();
        context.snapshot_for(window, None)
    }

    pub fn set_active_workspace(
        &self,
        workspace: OpenedWorkspace,
        source_window_label: impl Into<String>,
    ) -> WindowContextSnapshot {
        let source_window_label = source_window_label.into();
        let mut context = self.context();
        context.active_workspace = Some(workspace);
        context.touch();
        let mode = context
            .registered_windows
            .get(&source_window_label)
            .cloned()
            .unwrap_or(WindowMode::Main);
        context.snapshot_for(
            RegisteredWindow {
                label: source_window_label.clone(),
                mode,
            },
            Some(source_window_label),
        )
    }

    pub fn update_preferences(
        &self,
        theme: Option<AppTheme>,
        language: Option<AppLanguage>,
        source_window_label: Option<String>,
    ) -> WindowContextSnapshot {
        let mut context = self.context();
        let mut changed = false;

        if let Some(theme) = theme {
            if context.preferences.theme != theme {
                context.preferences.theme = theme;
                changed = true;
            }
        }

        if let Some(language) = language {
            if context.preferences.language != language {
                context.preferences.language = language;
                changed = true;
            }
        }

        if changed {
            context.touch();
        }

        let window = RegisteredWindow {
            label: source_window_label
                .clone()
                .unwrap_or_else(|| "main".to_owned()),
            mode: context
                .registered_windows
                .get(source_window_label.as_deref().unwrap_or("main"))
                .cloned()
                .unwrap_or(WindowMode::Main),
        };

        context.snapshot_for(window, source_window_label)
    }

    pub fn replace_preferences(
        &self,
        preferences: AppPreferencesSnapshot,
        source_window_label: Option<String>,
    ) -> WindowContextSnapshot {
        let mut context = self.context();
        let mut changed = false;

        if context.preferences != preferences {
            context.preferences = preferences;
            changed = true;
        }

        if changed {
            context.touch();
        }

        let window = RegisteredWindow {
            label: source_window_label
                .clone()
                .unwrap_or_else(|| "main".to_owned()),
            mode: context
                .registered_windows
                .get(source_window_label.as_deref().unwrap_or("main"))
                .cloned()
                .unwrap_or(WindowMode::Main),
        };

        context.snapshot_for(window, source_window_label)
    }

    pub fn active_workspace(&self) -> Option<OpenedWorkspace> {
        self.context().active_workspace.clone()
    }

    fn context(&self) -> MutexGuard<'_, WindowContextState> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

struct WindowContextState {
    registered_windows: HashMap<String, WindowMode>,
    active_workspace: Option<OpenedWorkspace>,
    preferences: AppPreferencesSnapshot,
    updated_at_ms: u64,
    source_window_label: Option<String>,
}

impl Default for WindowContextState {
    fn default() -> Self {
        let mut registered_windows = HashMap::new();
        registered_windows.insert("main".to_owned(), WindowMode::Main);

        Self {
            registered_windows,
            active_workspace: None,
            preferences: AppPreferencesSnapshot {
                theme: AppTheme::System,
                language: AppLanguage::ZhCn,
            },
            updated_at_ms: now_ms(),
            source_window_label: None,
        }
    }
}

impl WindowContextState {
    fn touch(&mut self) {
        self.updated_at_ms = now_ms().max(self.updated_at_ms + 1);
    }

    fn snapshot_for(
        &mut self,
        window: RegisteredWindow,
        source_window_label: Option<String>,
    ) -> WindowContextSnapshot {
        self.source_window_label = source_window_label.clone();

        WindowContextSnapshot {
            schema_version: WINDOW_CONTEXT_SCHEMA_VERSION,
            current_window: window,
            active_workspace: self.active_workspace.clone(),
            preferences: self.preferences.clone(),
            updated_at_ms: self.updated_at_ms,
            source_window_label,
        }
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::WindowContextRuntimeState;
    use crate::contracts::{AppLanguage, AppTheme, RegisteredWindow, WindowMode};

    #[test]
    fn registers_window_and_returns_default_preferences() {
        let state = WindowContextRuntimeState::default();
        let snapshot = state.register_window(RegisteredWindow {
            label: "terminal".to_owned(),
            mode: WindowMode::Terminal,
        });

        assert_eq!(snapshot.current_window.label, "terminal");
        assert_eq!(snapshot.current_window.mode, WindowMode::Terminal);
        assert_eq!(snapshot.preferences.theme, AppTheme::System);
        assert_eq!(snapshot.preferences.language, AppLanguage::ZhCn);
    }

    #[test]
    fn repeated_preference_update_is_idempotent() {
        let state = WindowContextRuntimeState::default();
        let first = state.update_preferences(
            Some(AppTheme::Dark),
            Some(AppLanguage::EnUs),
            Some("main".to_owned()),
        );
        let second = state.update_preferences(
            Some(AppTheme::Dark),
            Some(AppLanguage::EnUs),
            Some("main".to_owned()),
        );

        assert_eq!(first.updated_at_ms, second.updated_at_ms);
        assert_eq!(second.preferences.theme, AppTheme::Dark);
        assert_eq!(second.preferences.language, AppLanguage::EnUs);
    }

    #[test]
    fn replaces_preferences_from_persisted_snapshot() {
        let state = WindowContextRuntimeState::default();
        let snapshot = state.replace_preferences(
            crate::contracts::AppPreferencesSnapshot {
                theme: AppTheme::Light,
                language: AppLanguage::EnUs,
            },
            Some("main".to_owned()),
        );

        assert_eq!(snapshot.preferences.theme, AppTheme::Light);
        assert_eq!(snapshot.preferences.language, AppLanguage::EnUs);
    }
}
