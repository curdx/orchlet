use std::{
    collections::HashMap,
    path::Path,
    sync::{Mutex, MutexGuard},
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::contracts::{
    AppError, NotificationIgnoreAllRequest, NotificationIgnoreAllResult,
    NotificationNavigationAction, NotificationNavigationKind, NotificationNavigationRequest,
    NotificationPreferencesGetResult, NotificationPreferencesSnapshot,
    NotificationPreferencesUpdateRequest, NotificationPreferencesUpdateResult,
    NotificationTrayState, NotificationUnreadConversation, NotificationUnreadSummary,
    NotificationUnreadUpdateRequest,
};
use crate::{
    domain::notification::is_dnd_active_at_minute,
    infrastructure::persistence::json_store::{
        notification_preferences_store::{
            default_notification_preferences, load_notification_preferences,
            save_notification_preferences, unavailable_permission_snapshot,
            validate_notification_preferences_store,
        },
        workspace_registry_store::now_ms as store_now_ms,
    },
};
#[cfg(desktop)]
use std::time::Duration;
#[cfg(desktop)]
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager, PhysicalPosition, Position, Rect, Size, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

pub const NOTIFICATION_UNREAD_SCHEMA_VERSION: u32 = 1;
pub const NOTIFICATION_UNREAD_CHANGED_EVENT: &str = "notification-unread-changed";
pub const NOTIFICATION_NAVIGATION_CHANGED_EVENT: &str = "notification-navigation-requested";
pub const NOTIFICATION_PREFERENCES_CHANGED_EVENT: &str = "notification-preferences-changed";
#[cfg(desktop)]
pub const NOTIFICATION_TRAY_ID: &str = "main-tray";
#[cfg(desktop)]
const NOTIFICATION_PREVIEW_LABEL: &str = "notification-preview";
#[cfg(desktop)]
const NOTIFICATION_PREVIEW_WIDTH: f64 = 320.0;
#[cfg(desktop)]
const NOTIFICATION_PREVIEW_MIN_HEIGHT: f64 = 180.0;
#[cfg(desktop)]
const NOTIFICATION_PREVIEW_MAX_HEIGHT: f64 = 720.0;
#[cfg(desktop)]
const NOTIFICATION_PREVIEW_MARGIN: f64 = 8.0;
#[cfg(desktop)]
const NOTIFICATION_PREVIEW_HIDE_DELAY_MS: u64 = 240;
#[cfg(desktop)]
const NOTIFICATION_TRAY_BLINK_INTERVAL_MS: u64 = 500;
#[cfg(desktop)]
const NOTIFICATION_UNREAD_ICON_BYTES: &[u8] = include_bytes!("../../../icons/icon-unread.png");
#[cfg(desktop)]
const NOTIFICATION_TRANSPARENT_ICON_BYTES: &[u8] =
    include_bytes!("../../../icons/Transparency.png");

pub fn get_notification_preferences(
    app_data_dir: impl AsRef<Path>,
) -> Result<NotificationPreferencesGetResult, AppError> {
    Ok(NotificationPreferencesGetResult {
        preferences: load_notification_preferences(app_data_dir.as_ref())?,
    })
}

pub fn update_notification_preferences(
    app_data_dir: impl AsRef<Path>,
    request: NotificationPreferencesUpdateRequest,
) -> Result<NotificationPreferencesUpdateResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut preferences = load_notification_preferences(app_data_dir)?;
    let mut changed = false;

    macro_rules! apply_bool {
        ($field:ident, $value:expr) => {
            if let Some(value) = $value {
                if preferences.$field != value {
                    preferences.$field = value;
                    changed = true;
                }
            }
        };
    }

    apply_bool!(
        desktop_notifications_enabled,
        request.desktop_notifications_enabled
    );
    apply_bool!(sound_enabled, request.sound_enabled);
    apply_bool!(mentions_only, request.mentions_only);
    apply_bool!(message_preview_enabled, request.message_preview_enabled);
    apply_bool!(dnd_enabled, request.dnd_enabled);

    if let Some(minutes) = request.dnd_start_minutes {
        if preferences.dnd_start_minutes != minutes {
            preferences.dnd_start_minutes = minutes;
            changed = true;
        }
    }

    if let Some(minutes) = request.dnd_end_minutes {
        if preferences.dnd_end_minutes != minutes {
            preferences.dnd_end_minutes = minutes;
            changed = true;
        }
    }

    if changed {
        preferences.updated_at_ms = store_now_ms().max(preferences.updated_at_ms + 1);
    }

    preferences.permission = unavailable_permission_snapshot();
    save_notification_preferences(app_data_dir, &preferences)?;

    Ok(NotificationPreferencesUpdateResult { preferences })
}

pub fn validate_notification_preferences_store_for_app_data(
    app_data_dir: impl AsRef<Path>,
) -> Result<(), AppError> {
    validate_notification_preferences_store(app_data_dir.as_ref())
}

#[derive(Default)]
pub struct NotificationRuntimeState {
    inner: Mutex<NotificationState>,
}

impl NotificationRuntimeState {
    pub fn unread_summary(&self) -> NotificationUnreadSummary {
        let preferences = default_notification_preferences();
        self.unread_summary_with_preferences(&preferences)
    }

    pub fn unread_summary_with_preferences(
        &self,
        preferences: &NotificationPreferencesSnapshot,
    ) -> NotificationUnreadSummary {
        let mut state = self.state();
        state.rebuild_summary(preferences);
        state.summary.clone()
    }

    pub fn update_unread_summary(
        &self,
        request: NotificationUnreadUpdateRequest,
    ) -> NotificationUnreadSummary {
        let preferences = default_notification_preferences();
        self.update_unread_summary_with_preferences(request, &preferences)
    }

    pub fn update_unread_summary_with_preferences(
        &self,
        request: NotificationUnreadUpdateRequest,
        preferences: &NotificationPreferencesSnapshot,
    ) -> NotificationUnreadSummary {
        let mut state = self.state();
        state.source = NotificationSourceState {
            workspace_id: request.workspace_id,
            workspace_name: request.workspace_name,
            conversations: request.conversations,
            source_window_label: request.source_window_label,
            avatar_png: request.avatar_png,
        };
        state.rebuild_summary(preferences);

        state.summary.clone()
    }

    pub fn ignore_all_unread(
        &self,
        request: NotificationIgnoreAllRequest,
    ) -> NotificationIgnoreAllResult {
        let preferences = default_notification_preferences();
        self.ignore_all_unread_with_preferences(request, &preferences)
    }

    pub fn ignore_all_unread_with_preferences(
        &self,
        request: NotificationIgnoreAllRequest,
        preferences: &NotificationPreferencesSnapshot,
    ) -> NotificationIgnoreAllResult {
        let mut state = self.state();
        let target_workspace_id = request
            .workspace_id
            .clone()
            .or_else(|| state.summary.workspace_id.clone());
        let ignores_current_summary = target_workspace_id == state.summary.workspace_id;
        let ignored_count = if ignores_current_summary {
            let workspace_id = state.summary.workspace_id.as_deref();
            let ignored_pairs: Vec<(String, u64)> = state
                .summary
                .conversations
                .iter()
                .map(|conversation| {
                    (
                        ignored_key(workspace_id, &conversation.conversation_id),
                        conversation.updated_at_ms,
                    )
                })
                .collect();
            let ignored_count = ignored_pairs.len() as u32;

            for (key, updated_at_ms) in ignored_pairs {
                state.ignored_conversations.insert(key, updated_at_ms);
            }

            ignored_count
        } else {
            0
        };

        state.source.source_window_label = request.source_window_label;
        state.rebuild_summary(preferences);

        NotificationIgnoreAllResult {
            summary: state.summary.clone(),
            ignored_count,
        }
    }

    pub fn apply_preferences(
        &self,
        preferences: &NotificationPreferencesSnapshot,
    ) -> NotificationUnreadSummary {
        let mut state = self.state();
        state.rebuild_summary(preferences);
        state.summary.clone()
    }

    pub fn pending_navigation_action(&self) -> Option<NotificationNavigationAction> {
        self.state().navigation_action.clone()
    }

    pub fn dispatch_navigation(
        &self,
        request: NotificationNavigationRequest,
    ) -> Result<NotificationNavigationAction, AppError> {
        validate_navigation_request(&request)?;

        let mut state = self.state();
        let updated_at_ms = now_ms().max(state.summary.updated_at_ms + 1).max(
            state
                .navigation_action
                .as_ref()
                .map(|action| action.updated_at_ms + 1)
                .unwrap_or(0),
        );
        let action = NotificationNavigationAction {
            schema_version: NOTIFICATION_UNREAD_SCHEMA_VERSION,
            kind: request.kind,
            workspace_id: request.workspace_id,
            conversation_id: request.conversation_id,
            member_id: request.member_id,
            updated_at_ms,
            source_window_label: request.source_window_label,
        };

        state.navigation_action = Some(action.clone());
        Ok(action)
    }

    #[cfg(desktop)]
    pub fn apply_native_tray_state(&self, app: &AppHandle) {
        apply_native_tray_state(app, self);
    }

    #[cfg(desktop)]
    pub fn set_tray_hovered(&self, app: &AppHandle, hovered: bool, rect: Option<Rect>) {
        {
            let mut state = self.state();
            state.tray_hovered = hovered;
            if let Some(rect) = rect {
                state.last_tray_rect = Some(rect);
            }
            if hovered {
                state.hide_generation = state.hide_generation.saturating_add(1);
            } else {
                schedule_preview_hide(app.clone(), self);
                return;
            }
        }

        sync_preview_window(app, self);
    }

    #[cfg(desktop)]
    pub fn set_preview_hovered(&self, app: &AppHandle, hovered: bool) {
        {
            let mut state = self.state();
            state.preview_hovered = hovered;
            if hovered {
                state.hide_generation = state.hide_generation.saturating_add(1);
            } else {
                state.tray_hovered = false;
                schedule_preview_hide(app.clone(), self);
                return;
            }
        }

        sync_preview_window(app, self);
    }

    #[cfg(desktop)]
    pub fn force_hide_preview(&self, app: &AppHandle) {
        {
            let mut state = self.state();
            state.tray_hovered = false;
            state.preview_hovered = false;
            state.preview_visible = false;
            state.hide_generation = state.hide_generation.saturating_add(1);
        }
        hide_preview_window(app);
    }

    #[cfg(test)]
    fn native_tray_icon_intent_for_tests(&self) -> NativeTrayIconIntent {
        self.state().native_tray_icon_intent()
    }

    fn state(&self) -> MutexGuard<'_, NotificationState> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

struct NotificationState {
    summary: NotificationUnreadSummary,
    source: NotificationSourceState,
    navigation_action: Option<NotificationNavigationAction>,
    ignored_conversations: HashMap<String, u64>,
    #[cfg(desktop)]
    tray_hovered: bool,
    #[cfg(desktop)]
    preview_hovered: bool,
    #[cfg(desktop)]
    preview_visible: bool,
    #[cfg(desktop)]
    last_tray_rect: Option<Rect>,
    #[cfg(desktop)]
    blink_generation: u64,
    #[cfg(desktop)]
    blinking: bool,
    #[cfg(desktop)]
    hide_generation: u64,
}

impl Default for NotificationState {
    fn default() -> Self {
        let source = NotificationSourceState::default();
        Self {
            summary: NotificationUnreadSummary {
                schema_version: NOTIFICATION_UNREAD_SCHEMA_VERSION,
                workspace_id: None,
                workspace_name: None,
                total_unread_count: 0,
                conversations: Vec::new(),
                tray: default_tray_state_for(0),
                updated_at_ms: now_ms(),
                source_window_label: None,
            },
            source,
            navigation_action: None,
            ignored_conversations: HashMap::new(),
            #[cfg(desktop)]
            tray_hovered: false,
            #[cfg(desktop)]
            preview_hovered: false,
            #[cfg(desktop)]
            preview_visible: false,
            #[cfg(desktop)]
            last_tray_rect: None,
            #[cfg(desktop)]
            blink_generation: 0,
            #[cfg(desktop)]
            blinking: false,
            #[cfg(desktop)]
            hide_generation: 0,
        }
    }
}

#[derive(Default)]
struct NotificationSourceState {
    workspace_id: Option<String>,
    workspace_name: Option<String>,
    conversations: Vec<NotificationUnreadConversation>,
    source_window_label: Option<String>,
    avatar_png: Option<Vec<u8>>,
}

impl NotificationState {
    fn rebuild_summary(&mut self, preferences: &NotificationPreferencesSnapshot) {
        let conversations = apply_notification_preferences(
            &mut self.ignored_conversations,
            self.source.workspace_id.as_deref(),
            self.source.conversations.clone(),
            preferences,
        );
        let total_unread_count = total_unread_count(&conversations);
        let updated_at_ms = now_ms().max(self.summary.updated_at_ms + 1);

        self.summary = NotificationUnreadSummary {
            schema_version: NOTIFICATION_UNREAD_SCHEMA_VERSION,
            workspace_id: self.source.workspace_id.clone(),
            workspace_name: self.source.workspace_name.clone(),
            total_unread_count,
            conversations,
            tray: tray_state_for(total_unread_count, preferences),
            updated_at_ms,
            source_window_label: self.source.source_window_label.clone(),
        };
    }

    #[cfg(any(desktop, test))]
    fn native_tray_icon_intent(&self) -> NativeTrayIconIntent {
        if !self.summary.tray.has_unread {
            return NativeTrayIconIntent::Default;
        }

        if self
            .source
            .avatar_png
            .as_ref()
            .is_some_and(|bytes| !bytes.is_empty())
        {
            return NativeTrayIconIntent::UnreadAvatar;
        }

        NativeTrayIconIntent::UnreadFallback
    }

    #[cfg(desktop)]
    fn should_show_preview(&self) -> bool {
        self.summary.tray.has_unread
            && self.summary.total_unread_count > 0
            && (self.tray_hovered || self.preview_hovered)
    }
}

#[cfg(any(desktop, test))]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum NativeTrayIconIntent {
    Default,
    UnreadFallback,
    UnreadAvatar,
}

fn apply_notification_preferences(
    ignored_conversations: &mut HashMap<String, u64>,
    workspace_id: Option<&str>,
    conversations: Vec<NotificationUnreadConversation>,
    preferences: &NotificationPreferencesSnapshot,
) -> Vec<NotificationUnreadConversation> {
    let conversations =
        filter_ignored_conversations(ignored_conversations, workspace_id, conversations);

    conversations
        .into_iter()
        .filter(|conversation| !preferences.mentions_only || conversation_has_mention(conversation))
        .map(|mut conversation| {
            if !preferences.message_preview_enabled {
                conversation.last_message_preview = None;
            }
            conversation
        })
        .collect()
}

fn filter_ignored_conversations(
    ignored_conversations: &mut HashMap<String, u64>,
    workspace_id: Option<&str>,
    conversations: Vec<NotificationUnreadConversation>,
) -> Vec<NotificationUnreadConversation> {
    conversations
        .into_iter()
        .filter(|conversation| {
            let key = ignored_key(workspace_id, &conversation.conversation_id);
            match ignored_conversations.get(&key).copied() {
                Some(ignored_at_ms) if conversation.updated_at_ms <= ignored_at_ms => false,
                Some(_) => {
                    ignored_conversations.remove(&key);
                    true
                }
                None => true,
            }
        })
        .collect()
}

fn conversation_has_mention(conversation: &NotificationUnreadConversation) -> bool {
    conversation
        .last_message_preview
        .as_deref()
        .is_some_and(|preview| preview.contains('@'))
}

fn ignored_key(workspace_id: Option<&str>, conversation_id: &str) -> String {
    format!("{}:{}", workspace_id.unwrap_or(""), conversation_id)
}

fn total_unread_count(conversations: &[NotificationUnreadConversation]) -> u32 {
    conversations
        .iter()
        .map(|conversation| conversation.unread_count)
        .sum()
}

fn validate_navigation_request(request: &NotificationNavigationRequest) -> Result<(), AppError> {
    match request.kind {
        NotificationNavigationKind::AllUnread => Ok(()),
        NotificationNavigationKind::Conversation if request.conversation_id.is_some() => Ok(()),
        NotificationNavigationKind::Conversation => Err(AppError::recoverable_error(
            "notification.navigation.missingConversation",
            "无法打开会话。",
            "通知缺少会话目标；请从主窗口查看未读会话。",
            None,
        )),
        NotificationNavigationKind::MemberTerminal if request.member_id.is_some() => Ok(()),
        NotificationNavigationKind::MemberTerminal => Err(AppError::recoverable_error(
            "notification.navigation.missingMemberTerminal",
            "无法打开成员终端。",
            "通知缺少成员终端目标；请从成员列表打开终端。",
            None,
        )),
    }
}

fn tray_state_for(
    unread_count: u32,
    preferences: &NotificationPreferencesSnapshot,
) -> NotificationTrayState {
    let dnd_active = is_dnd_active_at_minute(preferences, current_day_minute_utc());
    let can_interrupt = preferences.desktop_notifications_enabled && !dnd_active;

    NotificationTrayState {
        unread_count,
        badge_label: if unread_count > 0 {
            Some(if unread_count > 99 {
                "99+".to_owned()
            } else {
                unread_count.to_string()
            })
        } else {
            None
        },
        has_unread: unread_count > 0 && can_interrupt,
    }
}

fn default_tray_state_for(unread_count: u32) -> NotificationTrayState {
    tray_state_for(unread_count, &default_notification_preferences())
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn current_day_minute_utc() -> u16 {
    ((now_ms() / 1_000 / 60) % 1_440_u64) as u16
}

#[cfg(desktop)]
pub fn setup_native_tray(app: &mut App) -> tauri::Result<()> {
    let handle = app.handle();
    let show_item = MenuItem::with_id(handle, "tray_show", "显示窗口", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(handle, "tray_quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(handle, &[&show_item, &quit_item])?;
    let mut builder = TrayIconBuilder::with_id(NOTIFICATION_TRAY_ID)
        .menu(&menu)
        .tooltip(handle.package_info().name.clone())
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "tray_show" => show_main_window(app),
            "tray_quit" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => show_main_window(tray.app_handle()),
            TrayIconEvent::Enter { rect, .. } | TrayIconEvent::Move { rect, .. } => {
                let notification_state = tray.app_handle().state::<NotificationRuntimeState>();
                notification_state.set_tray_hovered(tray.app_handle(), true, Some(rect));
            }
            TrayIconEvent::Leave { rect, .. } => {
                let notification_state = tray.app_handle().state::<NotificationRuntimeState>();
                notification_state.set_tray_hovered(tray.app_handle(), false, Some(rect));
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

#[cfg(not(desktop))]
pub fn setup_native_tray(_app: &mut tauri::App) -> tauri::Result<()> {
    Ok(())
}

#[cfg(desktop)]
fn apply_native_tray_state(app: &AppHandle, state: &NotificationRuntimeState) {
    let (intent, total, badge_label, avatar_png) = {
        let state = state.state();
        (
            state.native_tray_icon_intent(),
            state.summary.total_unread_count,
            state.summary.tray.badge_label.clone(),
            state.source.avatar_png.clone(),
        )
    };

    match intent {
        NativeTrayIconIntent::Default => {
            stop_tray_blink(app, state);
            set_tray_icon(app, default_tray_icon(app));
        }
        NativeTrayIconIntent::UnreadFallback => {
            let icon = unread_tray_icon().or_else(|| default_tray_icon(app));
            set_tray_icon(app, icon.clone());
            start_tray_blink(app.clone(), state, icon);
        }
        NativeTrayIconIntent::UnreadAvatar => {
            let icon = avatar_png
                .as_deref()
                .and_then(|bytes| Image::from_bytes(bytes).ok().map(|icon| icon.to_owned()))
                .or_else(unread_tray_icon)
                .or_else(|| default_tray_icon(app));
            set_tray_icon(app, icon.clone());
            start_tray_blink(app.clone(), state, icon);
        }
    }

    set_tray_tooltip(app, total, badge_label);
    set_taskbar_badge(app, total);
    sync_preview_window(app, state);
}

#[cfg(desktop)]
fn start_tray_blink(
    app: AppHandle,
    state: &NotificationRuntimeState,
    visible_icon: Option<Image<'static>>,
) {
    let Some(visible_icon) = visible_icon else {
        return;
    };
    let transparent_icon = transparent_tray_icon().unwrap_or_else(|| visible_icon.clone());
    let generation = {
        let mut state = state.state();
        state.blinking = true;
        state.blink_generation = state.blink_generation.saturating_add(1);
        state.blink_generation
    };

    thread::spawn(move || {
        let mut show_transparent = true;
        loop {
            thread::sleep(Duration::from_millis(NOTIFICATION_TRAY_BLINK_INTERVAL_MS));
            let notification_state = app.state::<NotificationRuntimeState>();
            let should_continue = {
                let state = notification_state.state();
                state.blinking
                    && state.blink_generation == generation
                    && state.summary.tray.has_unread
            };
            if !should_continue {
                return;
            }

            let icon = if show_transparent {
                transparent_icon.clone()
            } else {
                visible_icon.clone()
            };
            show_transparent = !show_transparent;
            set_tray_icon(&app, Some(icon));
        }
    });
}

#[cfg(desktop)]
fn stop_tray_blink(app: &AppHandle, state: &NotificationRuntimeState) {
    {
        let mut state = state.state();
        state.blinking = false;
        state.blink_generation = state.blink_generation.saturating_add(1);
    }
    if let Some(tray) = app.tray_by_id(NOTIFICATION_TRAY_ID) {
        let _ = tray.set_visible(true);
    }
}

#[cfg(desktop)]
fn schedule_preview_hide(app: AppHandle, state: &NotificationRuntimeState) {
    let generation = {
        let mut state = state.state();
        state.hide_generation = state.hide_generation.saturating_add(1);
        state.hide_generation
    };

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(NOTIFICATION_PREVIEW_HIDE_DELAY_MS));
        let notification_state = app.state::<NotificationRuntimeState>();
        let should_hide = {
            let mut state = notification_state.state();
            if state.hide_generation != generation || state.tray_hovered || state.preview_hovered {
                false
            } else {
                state.preview_visible = false;
                true
            }
        };
        if should_hide {
            hide_preview_window(&app);
        }
    });
}

#[cfg(desktop)]
fn sync_preview_window(app: &AppHandle, state: &NotificationRuntimeState) {
    let (should_show, rect, item_count) = {
        let state = state.state();
        (
            state.should_show_preview(),
            state.last_tray_rect,
            state.summary.conversations.len(),
        )
    };

    if !should_show {
        return;
    }

    let window = match ensure_preview_window(app) {
        Ok(window) => window,
        Err(_) => return,
    };
    resize_preview_window(&window, item_count);
    if let Some(rect) = rect {
        position_preview_window(app, &window, rect);
    }
    let _ = window.show();
    {
        let mut state = state.state();
        state.preview_visible = true;
    }
}

#[cfg(desktop)]
fn ensure_preview_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(NOTIFICATION_PREVIEW_LABEL) {
        return Ok(window);
    }

    WebviewWindowBuilder::new(
        app,
        NOTIFICATION_PREVIEW_LABEL,
        WebviewUrl::App("index.html".into()),
    )
    .initialization_script("window.__GOLUTRA_VIEW__ = 'notification-preview';")
    .title("golutra")
    .inner_size(NOTIFICATION_PREVIEW_WIDTH, NOTIFICATION_PREVIEW_MIN_HEIGHT)
    .min_inner_size(NOTIFICATION_PREVIEW_WIDTH, NOTIFICATION_PREVIEW_MIN_HEIGHT)
    .max_inner_size(NOTIFICATION_PREVIEW_WIDTH, NOTIFICATION_PREVIEW_MAX_HEIGHT)
    .resizable(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .visible(false)
    .build()
    .map_err(|error| format!("failed to create notification preview window: {error}"))
}

#[cfg(desktop)]
fn resize_preview_window(window: &WebviewWindow, item_count: usize) {
    let visible = item_count.min(6) as f64;
    let height = if visible == 0.0 {
        NOTIFICATION_PREVIEW_MIN_HEIGHT
    } else {
        (90.0 + visible * 80.0 + (visible - 1.0).max(0.0) * 8.0).clamp(
            NOTIFICATION_PREVIEW_MIN_HEIGHT,
            NOTIFICATION_PREVIEW_MAX_HEIGHT,
        )
    };
    let _ = window.set_size(Size::Logical(tauri::LogicalSize::new(
        NOTIFICATION_PREVIEW_WIDTH,
        height,
    )));
}

#[cfg(desktop)]
fn position_preview_window(app: &AppHandle, window: &WebviewWindow, rect: Rect) {
    let (preview_width, preview_height) = window
        .inner_size()
        .map(|size| (size.width as f64, size.height as f64))
        .unwrap_or((NOTIFICATION_PREVIEW_WIDTH, NOTIFICATION_PREVIEW_MIN_HEIGHT));
    let (origin_x, origin_y, width, height) = rect_metrics(rect);
    let mut x = origin_x + width - preview_width;
    let mut y = origin_y - preview_height - NOTIFICATION_PREVIEW_MARGIN;
    if y < 0.0 {
        y = origin_y + height + NOTIFICATION_PREVIEW_MARGIN;
    }
    if x < 0.0 {
        x = origin_x.max(0.0);
    }

    let monitor = app
        .monitor_from_point(origin_x + width * 0.5, origin_y + height * 0.5)
        .ok()
        .flatten()
        .or_else(|| app.primary_monitor().ok().flatten());
    if let Some(monitor) = monitor {
        let work_area = monitor.work_area();
        let min_x = work_area.position.x as f64;
        let min_y = work_area.position.y as f64;
        let max_x = (min_x + work_area.size.width as f64 - preview_width).max(min_x);
        let max_y = (min_y + work_area.size.height as f64 - preview_height).max(min_y);
        x = x.clamp(min_x, max_x);
        y = y.clamp(min_y, max_y);
    }

    let _ = window.set_position(Position::Physical(PhysicalPosition::new(
        x as i32, y as i32,
    )));
}

#[cfg(desktop)]
fn rect_metrics(rect: Rect) -> (f64, f64, f64, f64) {
    let (x, y) = match rect.position {
        Position::Physical(position) => (position.x as f64, position.y as f64),
        Position::Logical(position) => (position.x, position.y),
    };
    let (width, height) = match rect.size {
        Size::Physical(size) => (size.width as f64, size.height as f64),
        Size::Logical(size) => (size.width, size.height),
    };
    (x, y, width, height)
}

#[cfg(desktop)]
fn hide_preview_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(NOTIFICATION_PREVIEW_LABEL) {
        let _ = window.hide();
    }
}

#[cfg(desktop)]
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(desktop)]
fn set_tray_icon(app: &AppHandle, icon: Option<Image<'static>>) {
    if let Some(tray) = app.tray_by_id(NOTIFICATION_TRAY_ID) {
        let _ = tray.set_icon(icon);
        let _ = tray.set_visible(true);
    }
}

#[cfg(desktop)]
fn set_tray_tooltip(app: &AppHandle, total: u32, badge_label: Option<String>) {
    if let Some(tray) = app.tray_by_id(NOTIFICATION_TRAY_ID) {
        let base = app.package_info().name.clone();
        let tooltip = badge_label
            .filter(|_| total > 0)
            .map(|label| format!("{base} ({label})"))
            .unwrap_or(base);
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

#[cfg(desktop)]
fn set_taskbar_badge(app: &AppHandle, total: u32) {
    if let Some(window) = app.get_webview_window("main") {
        let count = if total == 0 { None } else { Some(total as i64) };
        let _ = window.set_badge_count(count);
    }
}

#[cfg(desktop)]
fn default_tray_icon(app: &AppHandle) -> Option<Image<'static>> {
    app.default_window_icon()
        .map(|icon| icon.clone().to_owned())
}

#[cfg(desktop)]
fn unread_tray_icon() -> Option<Image<'static>> {
    Image::from_bytes(NOTIFICATION_UNREAD_ICON_BYTES)
        .ok()
        .map(|icon| icon.to_owned())
}

#[cfg(desktop)]
fn transparent_tray_icon() -> Option<Image<'static>> {
    Image::from_bytes(NOTIFICATION_TRANSPARENT_ICON_BYTES)
        .ok()
        .map(|icon| icon.to_owned())
}

#[cfg(test)]
mod tests {
    use super::{current_day_minute_utc, NativeTrayIconIntent, NotificationRuntimeState};
    use crate::contracts::{
        NotificationIgnoreAllRequest, NotificationNavigationKind, NotificationNavigationRequest,
        NotificationUnreadConversation, NotificationUnreadUpdateRequest,
    };
    use crate::infrastructure::persistence::json_store::notification_preferences_store::default_notification_preferences;

    #[test]
    fn aggregates_unread_count_and_tray_badge() {
        let state = NotificationRuntimeState::default();
        let summary = state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![
                NotificationUnreadConversation {
                    conversation_id: "conversation-1".to_owned(),
                    title: "General".to_owned(),
                    unread_count: 2,
                    last_message_preview: Some("hello".to_owned()),
                    terminal_member_id: None,
                    workspace_path: None,
                    conversation_type: None,
                    member_count: None,
                    sender_id: None,
                    sender_name: None,
                    sender_avatar: None,
                    sender_can_open_terminal: None,
                    updated_at_ms: 1,
                },
                NotificationUnreadConversation {
                    conversation_id: "conversation-2".to_owned(),
                    title: "Review".to_owned(),
                    unread_count: 3,
                    last_message_preview: None,
                    terminal_member_id: Some("member-1".to_owned()),
                    workspace_path: None,
                    conversation_type: None,
                    member_count: None,
                    sender_id: None,
                    sender_name: None,
                    sender_avatar: None,
                    sender_can_open_terminal: None,
                    updated_at_ms: 2,
                },
            ],
            source_window_label: Some("main".to_owned()),
            avatar_png: None,
        });

        assert_eq!(summary.total_unread_count, 5);
        assert_eq!(summary.tray.badge_label.as_deref(), Some("5"));
        assert!(summary.tray.has_unread);
        assert_eq!(summary.conversations.len(), 2);
    }

    #[test]
    fn clears_tray_state_when_unread_count_is_zero() {
        let state = NotificationRuntimeState::default();
        let summary = state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: Vec::new(),
            source_window_label: Some("main".to_owned()),
            avatar_png: None,
        });

        assert_eq!(summary.total_unread_count, 0);
        assert_eq!(summary.tray.badge_label, None);
        assert!(!summary.tray.has_unread);
    }

    #[test]
    fn stores_pending_navigation_action_for_late_subscribers() {
        let state = NotificationRuntimeState::default();
        let action = state
            .dispatch_navigation(NotificationNavigationRequest {
                kind: NotificationNavigationKind::Conversation,
                workspace_id: Some("workspace-1".to_owned()),
                conversation_id: Some("conversation-1".to_owned()),
                member_id: None,
                source_window_label: Some("notification-preview".to_owned()),
            })
            .expect("navigation action should be valid");

        assert_eq!(action.kind, NotificationNavigationKind::Conversation);
        assert_eq!(action.conversation_id.as_deref(), Some("conversation-1"));
        assert_eq!(
            state
                .pending_navigation_action()
                .as_ref()
                .map(|action| action.updated_at_ms),
            Some(action.updated_at_ms),
        );
    }

    #[test]
    fn rejects_member_terminal_navigation_without_member_id() {
        let state = NotificationRuntimeState::default();
        let error = state
            .dispatch_navigation(NotificationNavigationRequest {
                kind: NotificationNavigationKind::MemberTerminal,
                workspace_id: Some("workspace-1".to_owned()),
                conversation_id: None,
                member_id: None,
                source_window_label: Some("notification-preview".to_owned()),
            })
            .expect_err("member terminal navigation requires a member id");

        assert_eq!(error.code, "notification.navigation.missingMemberTerminal");
    }

    #[test]
    fn ignore_all_filters_current_unread_without_marking_future_activity_ignored() {
        let state = NotificationRuntimeState::default();
        state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![NotificationUnreadConversation {
                conversation_id: "conversation-1".to_owned(),
                title: "General".to_owned(),
                unread_count: 2,
                last_message_preview: Some("hello".to_owned()),
                terminal_member_id: None,
                workspace_path: None,
                conversation_type: None,
                member_count: None,
                sender_id: None,
                sender_name: None,
                sender_avatar: None,
                sender_can_open_terminal: None,
                updated_at_ms: 10,
            }],
            source_window_label: Some("main".to_owned()),
            avatar_png: None,
        });

        let ignored = state.ignore_all_unread(NotificationIgnoreAllRequest {
            workspace_id: Some("workspace-1".to_owned()),
            source_window_label: Some("notification-preview".to_owned()),
        });

        assert_eq!(ignored.ignored_count, 1);
        assert_eq!(ignored.summary.total_unread_count, 0);
        assert!(ignored.summary.conversations.is_empty());
        assert!(!ignored.summary.tray.has_unread);

        let repeated = state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![NotificationUnreadConversation {
                conversation_id: "conversation-1".to_owned(),
                title: "General".to_owned(),
                unread_count: 2,
                last_message_preview: Some("hello".to_owned()),
                terminal_member_id: None,
                workspace_path: None,
                conversation_type: None,
                member_count: None,
                sender_id: None,
                sender_name: None,
                sender_avatar: None,
                sender_can_open_terminal: None,
                updated_at_ms: 10,
            }],
            source_window_label: Some("main".to_owned()),
            avatar_png: None,
        });

        assert_eq!(repeated.total_unread_count, 0);

        let newer = state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![NotificationUnreadConversation {
                conversation_id: "conversation-1".to_owned(),
                title: "General".to_owned(),
                unread_count: 3,
                last_message_preview: Some("new".to_owned()),
                terminal_member_id: None,
                workspace_path: None,
                conversation_type: None,
                member_count: None,
                sender_id: None,
                sender_name: None,
                sender_avatar: None,
                sender_can_open_terminal: None,
                updated_at_ms: 11,
            }],
            source_window_label: Some("main".to_owned()),
            avatar_png: None,
        });

        assert_eq!(newer.total_unread_count, 3);
        assert_eq!(newer.conversations.len(), 1);
    }

    #[test]
    fn dnd_preferences_suppress_tray_interruption_without_dropping_unread_count() {
        let state = NotificationRuntimeState::default();
        let mut preferences = default_notification_preferences();
        let current_minute = current_day_minute_utc();
        preferences.dnd_enabled = true;
        preferences.dnd_start_minutes = current_minute;
        preferences.dnd_end_minutes = (current_minute + 1) % 1440;

        let summary = state
            .update_unread_summary_with_preferences(unread_request("build ready"), &preferences);

        assert_eq!(summary.total_unread_count, 2);
        assert_eq!(summary.tray.unread_count, 2);
        assert_eq!(summary.tray.badge_label.as_deref(), Some("2"));
        assert!(!summary.tray.has_unread);
    }

    #[test]
    fn native_tray_icon_intent_defaults_when_there_is_no_interrupting_unread() {
        let state = NotificationRuntimeState::default();

        assert_eq!(
            state.native_tray_icon_intent_for_tests(),
            NativeTrayIconIntent::Default,
        );
    }

    #[test]
    fn native_tray_icon_intent_uses_unread_fallback_without_avatar_bytes() {
        let state = NotificationRuntimeState::default();
        state.update_unread_summary(unread_request("build ready"));

        assert_eq!(
            state.native_tray_icon_intent_for_tests(),
            NativeTrayIconIntent::UnreadFallback,
        );
    }

    #[test]
    fn native_tray_icon_intent_uses_avatar_when_avatar_bytes_are_present() {
        let state = NotificationRuntimeState::default();
        state.update_unread_summary(NotificationUnreadUpdateRequest {
            avatar_png: Some(vec![137, 80, 78, 71]),
            ..unread_request("build ready")
        });

        assert_eq!(
            state.native_tray_icon_intent_for_tests(),
            NativeTrayIconIntent::UnreadAvatar,
        );
    }

    #[test]
    fn native_tray_icon_intent_does_not_interrupt_during_dnd() {
        let state = NotificationRuntimeState::default();
        let mut preferences = default_notification_preferences();
        let current_minute = current_day_minute_utc();
        preferences.dnd_enabled = true;
        preferences.dnd_start_minutes = current_minute;
        preferences.dnd_end_minutes = (current_minute + 1) % 1440;

        state.update_unread_summary_with_preferences(
            NotificationUnreadUpdateRequest {
                avatar_png: Some(vec![137, 80, 78, 71]),
                ..unread_request("build ready")
            },
            &preferences,
        );

        assert_eq!(
            state.native_tray_icon_intent_for_tests(),
            NativeTrayIconIntent::Default,
        );
    }

    #[test]
    fn disabled_message_preview_hides_conversation_previews() {
        let state = NotificationRuntimeState::default();
        let mut preferences = default_notification_preferences();
        preferences.message_preview_enabled = false;

        let summary = state
            .update_unread_summary_with_preferences(unread_request("build ready"), &preferences);

        assert_eq!(summary.total_unread_count, 2);
        assert_eq!(summary.conversations.len(), 1);
        assert_eq!(summary.conversations[0].last_message_preview, None);
    }

    #[test]
    fn mentions_only_filters_non_mention_conversations() {
        let state = NotificationRuntimeState::default();
        let mut preferences = default_notification_preferences();
        preferences.mentions_only = true;

        let summary = state.update_unread_summary_with_preferences(
            NotificationUnreadUpdateRequest {
                workspace_id: Some("workspace-1".to_owned()),
                workspace_name: Some("alpha".to_owned()),
                conversations: vec![
                    unread_conversation("conversation-1", "no direct ping", 1),
                    unread_conversation("conversation-2", "@owner please review", 3),
                ],
                source_window_label: Some("main".to_owned()),
                avatar_png: None,
            },
            &preferences,
        );

        assert_eq!(summary.total_unread_count, 3);
        assert_eq!(summary.conversations.len(), 1);
        assert_eq!(
            summary.conversations[0].conversation_id.as_str(),
            "conversation-2"
        );
    }

    fn unread_request(preview: &str) -> NotificationUnreadUpdateRequest {
        NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![unread_conversation("conversation-1", preview, 2)],
            source_window_label: Some("main".to_owned()),
            avatar_png: None,
        }
    }

    fn unread_conversation(
        conversation_id: &str,
        preview: &str,
        unread_count: u32,
    ) -> NotificationUnreadConversation {
        NotificationUnreadConversation {
            conversation_id: conversation_id.to_owned(),
            title: "General".to_owned(),
            unread_count,
            last_message_preview: Some(preview.to_owned()),
            terminal_member_id: None,
            workspace_path: None,
            conversation_type: None,
            member_count: None,
            sender_id: None,
            sender_name: None,
            sender_avatar: None,
            sender_can_open_terminal: None,
            updated_at_ms: 10,
        }
    }
}
