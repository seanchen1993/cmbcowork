use std::path::Path;

use tauri::async_runtime::Receiver;
use tauri::AppHandle;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

use crate::paths::{candidate_xdg_config_dirs, candidate_xdg_data_dirs, maybe_infer_xdg_home};

/// On Windows, the bundled Bun runtime may try to read `B:\~BUN\locales\en_US.json`.
/// If the B: drive does not exist, this causes an EPERM error and `opencode serve` fails.
/// This function works around the issue by creating a virtual B: drive via `subst` and
/// placing a minimal locale file at the expected path.
#[cfg(target_os = "windows")]
fn ensure_bun_locale_workaround() {
    use std::fs;
    use std::process::Command;

    let target = Path::new("B:\\~BUN\\locales\\en_US.json");
    if target.exists() {
        return; // Already accessible, nothing to do.
    }

    // Build a fake B: drive under the user's profile directory.
    let base = match std::env::var("USERPROFILE") {
        Ok(profile) => std::path::PathBuf::from(profile).join(".openwork_fakeBdrive"),
        Err(_) => return,
    };

    let locale_dir = base.join("~BUN").join("locales");
    if let Err(_) = fs::create_dir_all(&locale_dir) {
        return;
    }

    let locale_file = locale_dir.join("en_US.json");
    if !locale_file.exists() {
        let _ = fs::write(&locale_file, "{}");
    }

    // Map the fake directory as B: drive (only if B: is not already mapped).
    let _ = Command::new("subst")
        .arg("B:")
        .arg(&base)
        .output();
}

pub fn find_free_port() -> Result<u16, String> {
    let listener = std::net::TcpListener::bind(("127.0.0.1", 0)).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    Ok(port)
}

pub fn build_engine_args(bind_host: &str, port: u16) -> Vec<String> {
    vec![
        "serve".to_string(),
        "--hostname".to_string(),
        bind_host.to_string(),
        "--port".to_string(),
        port.to_string(),
        // Allow all origins since the engine may be accessed remotely from client
        // devices or from the dev UI running on localhost:5173.
        "--cors".to_string(),
        "*".to_string(),
    ]
}

pub fn spawn_engine(
    app: &AppHandle,
    program: &Path,
    hostname: &str,
    port: u16,
    project_dir: &str,
    use_sidecar: bool,
    opencode_username: Option<&str>,
    opencode_password: Option<&str>,
) -> Result<(Receiver<CommandEvent>, CommandChild), String> {
    // Workaround: ensure B:\~BUN\locales\en_US.json is accessible on Windows.
    #[cfg(target_os = "windows")]
    ensure_bun_locale_workaround();

    let args = build_engine_args(hostname, port);

    let command = if use_sidecar {
        app.shell()
            .sidecar("opencode")
            .map_err(|e| format!("Failed to locate bundled OpenCode sidecar: {e}"))?
    } else {
        app.shell().command(program)
    };

    let mut command = command.args(args).current_dir(project_dir);

    if let Some(xdg_data_home) = maybe_infer_xdg_home(
        "XDG_DATA_HOME",
        candidate_xdg_data_dirs(),
        Path::new("opencode/auth.json"),
    ) {
        command = command.env("XDG_DATA_HOME", xdg_data_home);
    }

    let xdg_config_home = maybe_infer_xdg_home(
        "XDG_CONFIG_HOME",
        candidate_xdg_config_dirs(),
        Path::new("opencode/opencode.jsonc"),
    )
    .or_else(|| {
        maybe_infer_xdg_home(
            "XDG_CONFIG_HOME",
            candidate_xdg_config_dirs(),
            Path::new("opencode/opencode.json"),
        )
    });

    if let Some(xdg_config_home) = xdg_config_home {
        command = command.env("XDG_CONFIG_HOME", xdg_config_home);
    }

    command = command.env("OPENCODE_CLIENT", "openwork");
    command = command.env("OPENWORK", "1");

    if let Some(username) = opencode_username {
        if !username.trim().is_empty() {
            command = command.env("OPENCODE_SERVER_USERNAME", username);
        }
    }

    if let Some(password) = opencode_password {
        if !password.trim().is_empty() {
            command = command.env("OPENCODE_SERVER_PASSWORD", password);
        }
    }

    command
        .spawn()
        .map_err(|e| format!("Failed to start opencode: {e}"))
}
