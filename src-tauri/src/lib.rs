pub mod app;
pub mod contracts;
pub mod domain;
pub mod gateway;
pub mod infrastructure;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .manage(app::workspace::WorkspaceRuntimeState::default())
        .manage(app::window_context::WindowContextRuntimeState::default())
        .invoke_handler(tauri::generate_handler![
            gateway::workspace_commands::workspace_selection_status,
            gateway::workspace_commands::workspace_recent_list,
            gateway::workspace_commands::workspace_open,
            gateway::workspace_commands::workspace_open_in_file_manager,
            gateway::workspace_commands::window_context_get,
            gateway::workspace_commands::window_context_register,
            gateway::workspace_commands::app_preferences_update,
            gateway::workspace_commands::window_open_mode,
            gateway::data_integrity_commands::data_integrity_validate,
            gateway::member_commands::members_list,
            gateway::member_commands::member_invite,
            gateway::member_commands::member_remove,
            gateway::contact_commands::contacts_list,
            gateway::contact_commands::contact_create,
            gateway::contact_commands::contact_update,
            gateway::contact_commands::contact_delete,
            gateway::chat_commands::chat_conversations_list,
            gateway::chat_commands::chat_group_conversation_create,
            gateway::chat_commands::chat_group_conversation_members_update,
            gateway::chat_commands::chat_private_conversation_start
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
