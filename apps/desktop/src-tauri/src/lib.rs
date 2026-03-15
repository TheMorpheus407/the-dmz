use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

const SAVE_VERSION: &str = "1.0.0";
const SAVE_DIR: &str = "the-dmz";
const SAVE_FILE_NAME: &str = "savegame.json";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalSave {
    pub version: String,
    pub timestamp: i64,
    pub session_id: String,
    pub day_number: i32,
    pub phase: String,
    pub snapshot: serde_json::Value,
    pub events: Vec<serde_json::Value>,
    pub checksum: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaveSlot {
    pub slot_id: i32,
    pub save: Option<LocalSave>,
    pub metadata: SaveMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaveMetadata {
    pub slot_id: i32,
    pub session_id: String,
    pub day_number: i32,
    pub phase: String,
    pub timestamp: i64,
    pub play_time_seconds: i64,
    pub screenshot_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowState {
    pub width: i32,
    pub height: i32,
    pub x: i32,
    pub y: i32,
    pub maximized: bool,
    pub fullscreen: bool,
}

pub struct AppState {
    pub save_dir: Mutex<PathBuf>,
}

fn get_save_directory() -> PathBuf {
    let base = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join(SAVE_DIR)
}

fn calculate_checksum(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    hex::encode(hasher.finalize())
}

#[tauri::command]
pub fn save_game(
    state: State<'_, AppState>,
    session_id: String,
    day_number: i32,
    phase: String,
    snapshot: serde_json::Value,
    events: Vec<serde_json::Value>,
    slot_id: Option<i32>,
) -> Result<SaveSlot, String> {
    let save_dir = state.save_dir.lock().map_err(|e| e.to_string())?;
    
    fs::create_dir_all(&*save_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Utc::now().timestamp();
    let save_data = LocalSave {
        version: SAVE_VERSION.to_string(),
        timestamp,
        session_id: session_id.clone(),
        day_number,
        phase: phase.clone(),
        snapshot,
        events,
        checksum: String::new(),
    };

    let json = serde_json::to_string(&save_data).map_err(|e| e.to_string())?;
    let checksum = calculate_checksum(&json);
    
    let save_with_checksum = LocalSave {
        checksum,
        ..save_data
    };

    let slot_number = slot_id.unwrap_or(0);
    let save_file = save_dir.join(format!("slot_{}.json", slot_number));
    let json_with_checksum = serde_json::to_string_pretty(&save_with_checksum).map_err(|e| e.to_string())?;
    
    fs::write(&save_file, json_with_checksum).map_err(|e| e.to_string())?;

    let metadata = SaveMetadata {
        slot_id: slot_number,
        session_id,
        day_number,
        phase,
        timestamp,
        play_time_seconds: 0,
        screenshot_path: None,
    };

    Ok(SaveSlot {
        slot_id: slot_number,
        save: Some(save_with_checksum),
        metadata,
    })
}

#[tauri::command]
pub fn load_game(state: State<'_, AppState>, slot_id: i32) -> Result<SaveSlot, String> {
    let save_dir = state.save_dir.lock().map_err(|e| e.to_string())?;
    let save_file = save_dir.join(format!("slot_{}.json", slot_id));

    if !save_file.exists() {
        return Ok(SaveSlot {
            slot_id,
            save: None,
            metadata: SaveMetadata {
                slot_id,
                session_id: String::new(),
                day_number: 0,
                phase: String::new(),
                timestamp: 0,
                play_time_seconds: 0,
                screenshot_path: None,
            },
        });
    }

    let content = fs::read_to_string(&save_file).map_err(|e| e.to_string())?;
    let save: LocalSave = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let stored_checksum = save.checksum.clone();
    let json_without_checksum = serde_json::to_string(&LocalSave {
        checksum: String::new(),
        ..save.clone()
    }).map_err(|e| e.to_string())?;
    
    let calculated_checksum = calculate_checksum(&json_without_checksum);
    
    if stored_checksum != calculated_checksum {
        return Err("Save file checksum mismatch - file may be corrupted".to_string());
    }

    Ok(SaveSlot {
        slot_id,
        save: Some(save),
        metadata: SaveMetadata {
            slot_id,
            session_id: save.session_id,
            day_number: save.day_number,
            phase: save.phase,
            timestamp: save.timestamp,
            play_time_seconds: 0,
            screenshot_path: None,
        },
    })
}

#[tauri::command]
pub fn list_save_slots(state: State<'_, AppState>) -> Result<Vec<SaveSlot>, String> {
    let save_dir = state.save_dir.lock().map_err(|e| e.to_string())?;
    
    let mut slots = Vec::new();
    
    for i in 0..10 {
        let save_file = save_dir.join(format!("slot_{}.json", i));
        
        if save_file.exists() {
            match load_game(state.clone(), i) {
                Ok(slot) => slots.push(slot),
                Err(_) => continue,
            }
        } else {
            slots.push(SaveSlot {
                slot_id: i,
                save: None,
                metadata: SaveMetadata {
                    slot_id: i,
                    session_id: String::new(),
                    day_number: 0,
                    phase: String::new(),
                    timestamp: 0,
                    play_time_seconds: 0,
                    screenshot_path: None,
                },
            });
        }
    }
    
    Ok(slots)
}

#[tauri::command]
pub fn delete_save(state: State<'_, AppState>, slot_id: i32) -> Result<(), String> {
    let save_dir = state.save_dir.lock().map_err(|e| e.to_string())?;
    let save_file = save_dir.join(format!("slot_{}.json", slot_id));
    
    if save_file.exists() {
        fs::remove_file(&save_file).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn export_save(state: State<'_, AppState>, slot_id: i32, path: String) -> Result<String, String> {
    let save_dir = state.save_dir.lock().map_err(|e| e.to_string())?;
    let save_file = save_dir.join(format!("slot_{}.json", slot_id));
    
    if !save_file.exists() {
        return Err("Save slot is empty".to_string());
    }
    
    let content = fs::read_to_string(&save_file).map_err(|e| e.to_string())?;
    let export_path = PathBuf::from(path);
    
    fs::write(&export_path, content).map_err(|e| e.to_string())?;
    
    Ok(export_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn import_save(state: State<'_, AppState>, path: String, slot_id: i32) -> Result<SaveSlot, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    
    let save: LocalSave = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    let save_dir = state.save_dir.lock().map_err(|e| e.to_string())?;
    fs::create_dir_all(&*save_dir).map_err(|e| e.to_string())?;
    
    let save_file = save_dir.join(format!("slot_{}.json", slot_id));
    fs::write(&save_file, &content).map_err(|e| e.to_string())?;
    
    drop(save_dir);
    
    load_game(state, slot_id)
}

#[tauri::command]
pub fn get_window_state(window: tauri::Window) -> Result<WindowState, String> {
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let maximized = window.is_maximized().map_err(|e| e.to_string())?;
    let fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;

    Ok(WindowState {
        width: size.width as i32,
        height: size.height as i32,
        x: position.x,
        y: position.y,
        maximized,
        fullscreen,
    })
}

#[tauri::command]
pub fn set_fullscreen(window: tauri::Window, fullscreen: bool) -> Result<(), String> {
    window.set_fullscreen(fullscreen).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn minimize_to_tray(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let save_dir = get_save_directory();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::LogDir { 
                    file_name: Some("the-dmz".into()) 
                },
            ))
            .build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .manage(AppState {
            save_dir: Mutex::new(save_dir),
        })
        .invoke_handler(tauri::generate_handler![
            save_game,
            load_game,
            list_save_slots,
            delete_save,
            export_save,
            import_save,
            get_window_state,
            set_fullscreen,
            minimize_to_tray,
        ])
        .setup(|app| {
            log::info!("The DMZ desktop application starting...");
            
            #[cfg(desktop)]
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder};
                use tauri::tray::TrayIconBuilder;
                
                let quit = MenuItemBuilder::new("Quit The DMZ")
                    .id("quit")
                    .build(app)?;
                
                let show = MenuItemBuilder::new("Show Window")
                    .id("show")
                    .build(app)?;
                
                let menu = MenuBuilder::new(app)
                    .item(&show)
                    .separator()
                    .item(&quit)
                    .build()?;
                
                let _tray = TrayIconBuilder::new()
                    .menu(&menu)
                    .on_menu_event(|app, event| {
                        match event.id().as_ref() {
                            "quit" => {
                                app.exit(0);
                            }
                            "show" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            _ => {}
                        }
                    })
                    .build(app)?;
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
