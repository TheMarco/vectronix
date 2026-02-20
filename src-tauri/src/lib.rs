use std::sync::Mutex;
use tauri::{
    menu::{
        AboutMetadata, CheckMenuItem, CheckMenuItemBuilder, MenuBuilder, PredefinedMenuItem,
        SubmenuBuilder,
    },
    Emitter, Manager,
};

struct DisplayMenu {
    vector: CheckMenuItem<tauri::Wry>,
    crt: CheckMenuItem<tauri::Wry>,
}

#[tauri::command]
fn sync_display_mode(state: tauri::State<Mutex<DisplayMenu>>, mode: String) {
    let items = state.lock().unwrap();
    let _ = items.vector.set_checked(mode == "vector");
    let _ = items.crt.set_checked(mode == "crt");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![sync_display_mode])
        .setup(|app| {
            // --- App submenu (standard macOS) ---
            let app_submenu = SubmenuBuilder::new(app, "Vectronix")
                .about(Some(AboutMetadata {
                    name: Some("Vectronix".into()),
                    version: Some("0.1.0".into()),
                    ..Default::default()
                }))
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            // --- View submenu (display mode) ---
            let vector_mode = CheckMenuItemBuilder::new("Vector Display")
                .id("display_vector")
                .checked(false)
                .accelerator("CmdOrCtrl+1")
                .build(app)?;

            let crt_mode = CheckMenuItemBuilder::new("CRT Display")
                .id("display_crt")
                .checked(false)
                .accelerator("CmdOrCtrl+2")
                .build(app)?;

            let view_submenu = SubmenuBuilder::new(app, "View")
                .item(&vector_mode)
                .item(&crt_mode)
                .build()?;

            // --- Window submenu (standard macOS fullscreen) ---
            let window_submenu = SubmenuBuilder::new(app, "Window")
                .item(&PredefinedMenuItem::minimize(app, None)?)
                .separator()
                .item(&PredefinedMenuItem::fullscreen(app, None)?)
                .build()?;

            let menu = MenuBuilder::new(app)
                .items(&[&app_submenu, &view_submenu, &window_submenu])
                .build()?;

            app.set_menu(menu)?;

            // Store clones for the sync command
            app.manage(Mutex::new(DisplayMenu {
                vector: vector_mode.clone(),
                crt: crt_mode.clone(),
            }));

            // --- Menu event handler ---
            app.on_menu_event(move |app_handle, event| {
                match event.id().0.as_str() {
                    "display_vector" => {
                        let _ = vector_mode.set_checked(true);
                        let _ = crt_mode.set_checked(false);
                        let _ = app_handle.emit("menu-event", "display_vector");
                    }
                    "display_crt" => {
                        let _ = crt_mode.set_checked(true);
                        let _ = vector_mode.set_checked(false);
                        let _ = app_handle.emit("menu-event", "display_crt");
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
