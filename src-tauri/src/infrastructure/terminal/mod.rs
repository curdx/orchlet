use std::{
    env,
    ffi::OsString,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
    thread::{self, JoinHandle},
};

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};

use crate::{
    app::terminal::{
        TerminalLaunchProfile, TerminalOutputHandler, TerminalSessionHandle,
        TerminalSessionLauncher,
    },
    contracts::{AppError, TerminalStreamKind},
};

pub struct PtyTerminalLauncher;

impl TerminalSessionLauncher for PtyTerminalLauncher {
    fn spawn(
        &self,
        profile: TerminalLaunchProfile,
        output_handler: TerminalOutputHandler,
    ) -> Result<Box<dyn TerminalSessionHandle>, AppError> {
        if !profile.use_shell_wrapper {
            let resolution = resolve_terminal_command(&profile.command);
            if !resolution.is_available() {
                return Err(terminal_command_unavailable_error(
                    &profile.command,
                    &resolution,
                ));
            }
        }

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: profile.rows,
                cols: profile.cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(pty_launch_error("openpty"))?;
        let reader = pair
            .master
            .try_clone_reader()
            .map_err(pty_launch_error("cloneReader"))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(pty_launch_error("takeWriter"))?;
        let mut command = command_builder(&profile);
        command.cwd(profile.cwd.as_os_str());
        let child = pair
            .slave
            .spawn_command(command)
            .map_err(pty_launch_error("spawnCommand"))?;
        drop(pair.slave);
        let reader_thread = spawn_reader_thread(reader, output_handler);

        Ok(Box::new(PtyTerminalSession {
            _master: pair.master,
            writer: Mutex::new(writer),
            child: Mutex::new(child),
            _reader_thread: reader_thread,
        }))
    }
}

struct PtyTerminalSession {
    _master: Box<dyn MasterPty + Send>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn Child + Send + Sync>>,
    _reader_thread: JoinHandle<()>,
}

impl TerminalSessionHandle for PtyTerminalSession {
    fn write_input(&self, input: &str) -> Result<(), AppError> {
        let mut writer = self.writer.lock().map_err(|_| {
            AppError::recoverable_error(
                "terminal.input.writeFailed",
                "无法写入终端输入。",
                "请重新打开终端会话后重试。",
                Some("pty writer lock poisoned".to_owned()),
            )
        })?;
        writer
            .write_all(input.as_bytes())
            .and_then(|_| writer.flush())
            .map_err(|error| {
                AppError::recoverable_error(
                    "terminal.input.writeFailed",
                    "无法写入终端输入。",
                    "请重新打开终端会话后重试。",
                    Some(error.to_string()),
                )
            })
    }

    fn resize(&self, cols: u16, rows: u16) -> Result<(), AppError> {
        self._master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|error| {
                AppError::recoverable_error(
                    "terminal.resize.failed",
                    "无法调整终端尺寸。",
                    "请重新打开终端会话后重试。",
                    Some(error.to_string()),
                )
            })
    }

    fn close(&self) -> Result<(), AppError> {
        let mut child = self.child.lock().map_err(|_| {
            AppError::recoverable_error(
                "terminal.close.failed",
                "无法关闭终端会话。",
                "请重新打开终端窗口后重试。",
                Some("pty child lock poisoned".to_owned()),
            )
        })?;
        child.kill().map_err(|error| {
            AppError::recoverable_error(
                "terminal.close.failed",
                "无法关闭终端会话。",
                "请重新打开终端窗口后重试。",
                Some(error.to_string()),
            )
        })
    }
}

impl Drop for PtyTerminalSession {
    fn drop(&mut self) {
        if let Ok(mut child) = self.child.lock() {
            let _ = child.kill();
        }
    }
}

pub fn default_shell_command() -> String {
    std::env::var("SHELL")
        .or_else(|_| std::env::var("COMSPEC"))
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            if cfg!(windows) {
                "cmd.exe".to_owned()
            } else {
                "/bin/sh".to_owned()
            }
        })
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TerminalShellCandidate {
    pub label: String,
    pub command: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TerminalCommandResolutionStatus {
    Available,
    Missing,
    Invalid,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TerminalCommandResolution {
    pub status: TerminalCommandResolutionStatus,
    pub executable: Option<String>,
    pub resolved_path: Option<PathBuf>,
    pub message: String,
    pub user_action: String,
    pub details: Option<String>,
}

impl TerminalCommandResolution {
    pub fn is_available(&self) -> bool {
        self.status == TerminalCommandResolutionStatus::Available
    }
}

pub fn shell_command_candidates() -> Vec<TerminalShellCandidate> {
    let mut candidates = Vec::new();
    push_shell_candidate(&mut candidates, "默认 shell", default_shell_command());

    if cfg!(windows) {
        if let Ok(comspec) = env::var("COMSPEC") {
            push_shell_candidate(&mut candidates, "COMSPEC", comspec);
        }
        push_shell_candidate(&mut candidates, "Command Prompt", "cmd.exe");
        push_shell_candidate(&mut candidates, "Windows PowerShell", "powershell.exe");
        push_shell_candidate(&mut candidates, "PowerShell", "pwsh.exe");
    } else {
        if let Ok(shell) = env::var("SHELL") {
            push_shell_candidate(&mut candidates, "登录 shell", shell);
        }
        push_shell_candidate(&mut candidates, "sh", "/bin/sh");
        push_shell_candidate(&mut candidates, "bash", "/bin/bash");
        push_shell_candidate(&mut candidates, "zsh", "/bin/zsh");
        push_shell_candidate(&mut candidates, "fish", "/usr/bin/fish");
        push_shell_candidate(&mut candidates, "fish", "/opt/homebrew/bin/fish");
    }

    candidates
}

pub fn resolve_terminal_command(command: &str) -> TerminalCommandResolution {
    let executable = match command_executable(command) {
        Ok(executable) => executable,
        Err(message) => {
            return TerminalCommandResolution {
                status: TerminalCommandResolutionStatus::Invalid,
                executable: None,
                resolved_path: None,
                message,
                user_action: "请填写有效的 shell 或 CLI 命令后重试。".to_owned(),
                details: Some(format!("command={}", command.trim())),
            };
        }
    };

    if has_path_separator(&executable) || Path::new(&executable).is_absolute() {
        let path = PathBuf::from(&executable);

        if command_path_exists(&path) {
            return TerminalCommandResolution {
                status: TerminalCommandResolutionStatus::Available,
                executable: Some(executable),
                resolved_path: Some(path),
                message: "终端环境可用。".to_owned(),
                user_action: "可以直接启动该终端环境。".to_owned(),
                details: None,
            };
        }

        return TerminalCommandResolution {
            status: TerminalCommandResolutionStatus::Missing,
            executable: Some(executable.clone()),
            resolved_path: None,
            message: "配置的终端命令不存在。".to_owned(),
            user_action: "请安装该 CLI，或把成员运行时命令更新为有效路径后重试。".to_owned(),
            details: Some(format!("executable={}", executable)),
        };
    }

    if let Some(path) = find_executable_in_path(&executable) {
        return TerminalCommandResolution {
            status: TerminalCommandResolutionStatus::Available,
            executable: Some(executable),
            resolved_path: Some(path),
            message: "终端环境可用。".to_owned(),
            user_action: "可以直接启动该终端环境。".to_owned(),
            details: None,
        };
    }

    TerminalCommandResolution {
        status: TerminalCommandResolutionStatus::Missing,
        executable: Some(executable.clone()),
        resolved_path: None,
        message: "未在 PATH 中找到配置的终端命令。".to_owned(),
        user_action: "请安装该 CLI，或把成员运行时命令更新为有效命令后重试。".to_owned(),
        details: Some(format!(
            "executable={} pathEntriesChecked={}",
            executable,
            executable_search_dirs().len()
        )),
    }
}

pub fn terminal_command_unavailable_error(
    command: &str,
    resolution: &TerminalCommandResolution,
) -> AppError {
    let code = match resolution.status {
        TerminalCommandResolutionStatus::Invalid => "terminal.command.invalid",
        TerminalCommandResolutionStatus::Missing => "terminal.command.missing",
        TerminalCommandResolutionStatus::Available => "terminal.command.unavailable",
    };
    let executable = resolution
        .executable
        .as_deref()
        .unwrap_or_else(|| command.trim());

    AppError::recoverable_error(
        code,
        format!(
            "终端启动失败：{}{}",
            resolution.message,
            launch_subject(executable)
        ),
        resolution.user_action.clone(),
        Some(format!(
            "impactScope=current terminal session was not created command={} details={}",
            command.trim(),
            resolution.details.as_deref().unwrap_or("none")
        )),
    )
}

fn command_builder(profile: &TerminalLaunchProfile) -> CommandBuilder {
    let mut command = if !profile.use_shell_wrapper {
        CommandBuilder::new(&profile.command)
    } else if cfg!(windows) {
        let mut command = CommandBuilder::new(
            std::env::var("COMSPEC")
                .ok()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "cmd.exe".to_owned()),
        );
        command.args(["/K", profile.command.as_str()]);
        command
    } else {
        let shell = default_shell_command();
        let mut command = CommandBuilder::new(shell);
        command.args(["-lc", profile.command.as_str()]);
        command
    };
    apply_terminal_command_environment(&mut command);
    command
}

fn spawn_reader_thread(
    mut reader: Box<dyn Read + Send>,
    output_handler: TerminalOutputHandler,
) -> JoinHandle<()> {
    thread::spawn(move || {
        let mut buffer = [0_u8; 8192];

        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(length) => {
                    let chunk = String::from_utf8_lossy(&buffer[..length]).to_string();
                    output_handler(chunk, TerminalStreamKind::Stdout);
                }
                Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => break,
            }
        }
    })
}

fn pty_launch_error<E>(stage: &'static str) -> impl FnOnce(E) -> AppError
where
    E: std::fmt::Display,
{
    move |error| {
        if stage == "openpty" {
            return AppError::recoverable_error(
                "terminal.pty.resourceLimit",
                "系统资源不足，无法创建新的终端 PTY。",
                "请关闭部分终端或后台任务后重试。",
                Some(format!(
                    "impactScope=current terminal session was not created stage={} error={}",
                    stage, error
                )),
            );
        }

        AppError::recoverable_error(
            "terminal.pty.launchFailed",
            "终端启动失败，运行时命令无法执行。",
            "请检查工作区路径和运行时命令是否可用后重试。",
            Some(format!(
                "impactScope=current terminal session was not created stage={} error={}",
                stage, error
            )),
        )
    }
}

fn push_shell_candidate(
    candidates: &mut Vec<TerminalShellCandidate>,
    label: impl Into<String>,
    command: impl Into<String>,
) {
    let command = command.into().trim().to_owned();

    if command.is_empty()
        || candidates
            .iter()
            .any(|candidate| candidate.command == command)
    {
        return;
    }

    candidates.push(TerminalShellCandidate {
        label: label.into(),
        command,
    });
}

fn command_executable(command: &str) -> Result<String, String> {
    let command = command.trim();

    if command.is_empty() {
        return Err("终端命令为空。".to_owned());
    }

    let mut chars = command.chars();
    let first = chars.next().expect("non-empty command");

    if first == '"' || first == '\'' {
        let mut executable = String::new();
        let mut escaped = false;

        for value in chars {
            if escaped {
                executable.push(value);
                escaped = false;
                continue;
            }

            if value == '\\' {
                escaped = true;
                continue;
            }

            if value == first {
                if executable.trim().is_empty() {
                    return Err("终端命令的可执行文件为空。".to_owned());
                }

                return Ok(executable);
            }

            executable.push(value);
        }

        return Err("终端命令包含未闭合的引号。".to_owned());
    }

    Ok(command
        .split_whitespace()
        .next()
        .unwrap_or_default()
        .to_owned())
}

fn has_path_separator(value: &str) -> bool {
    value.contains('/') || value.contains('\\')
}

fn find_executable_in_path(executable: &str) -> Option<PathBuf> {
    find_executable_in_dirs(executable, executable_search_dirs())
}

fn find_executable_in_dirs(executable: &str, directories: Vec<PathBuf>) -> Option<PathBuf> {
    let extensions = executable_extensions(executable);

    for directory in directories {
        for extension in &extensions {
            let candidate = directory.join(format!("{}{}", executable, extension));

            if command_path_exists(&candidate) {
                return Some(candidate);
            }
        }
    }

    None
}

fn apply_terminal_command_environment(command: &mut CommandBuilder) {
    if let Some(path) = augmented_path() {
        command.env("PATH", path);
    }

    command.env("TERM", "xterm-256color");
}

fn augmented_path() -> Option<OsString> {
    env::join_paths(executable_search_dirs()).ok()
}

fn executable_search_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if let Some(path) = env::var_os("PATH") {
        for directory in env::split_paths(&path) {
            push_existing_dir(&mut dirs, directory);
        }
    }

    for directory in common_binary_dirs() {
        push_existing_dir(&mut dirs, directory);
    }

    dirs
}

fn common_binary_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if cfg!(windows) {
        push_optional_dir(
            &mut dirs,
            env::var_os("LOCALAPPDATA").map(|value| PathBuf::from(value).join("Programs")),
        );
        push_optional_dir(
            &mut dirs,
            env::var_os("LOCALAPPDATA")
                .map(|value| PathBuf::from(value).join("Microsoft\\WindowsApps")),
        );
        push_optional_dir(
            &mut dirs,
            env::var_os("APPDATA").map(|value| PathBuf::from(value).join("npm")),
        );
        push_optional_dir(
            &mut dirs,
            env::var_os("LOCALAPPDATA").map(|value| PathBuf::from(value).join("npm")),
        );
        push_optional_dir(&mut dirs, env::var_os("ProgramFiles").map(PathBuf::from));
        push_optional_dir(
            &mut dirs,
            env::var_os("ProgramFiles(x86)").map(PathBuf::from),
        );
        push_optional_dir(
            &mut dirs,
            env::var_os("USERPROFILE").map(|value| PathBuf::from(value).join("scoop\\shims")),
        );
        push_optional_dir(
            &mut dirs,
            env::var_os("SCOOP").map(|value| PathBuf::from(value).join("shims")),
        );
    } else {
        push_existing_dir(&mut dirs, PathBuf::from("/usr/local/bin"));
        push_existing_dir(&mut dirs, PathBuf::from("/usr/bin"));
        push_existing_dir(&mut dirs, PathBuf::from("/bin"));
        push_existing_dir(&mut dirs, PathBuf::from("/opt/homebrew/bin"));
        push_existing_dir(&mut dirs, PathBuf::from("/opt/bin"));
        push_optional_dir(
            &mut dirs,
            env::var_os("HOME").map(|value| PathBuf::from(value).join(".local/bin")),
        );
        push_optional_dir(
            &mut dirs,
            env::var_os("HOME").map(|value| PathBuf::from(value).join(".cargo/bin")),
        );
        push_optional_dir(
            &mut dirs,
            env::var_os("HOME").map(|value| PathBuf::from(value).join(".bun/bin")),
        );
    }

    dirs
}

fn push_optional_dir(dirs: &mut Vec<PathBuf>, directory: Option<PathBuf>) {
    if let Some(directory) = directory {
        push_existing_dir(dirs, directory);
    }
}

fn push_existing_dir(dirs: &mut Vec<PathBuf>, directory: PathBuf) {
    if directory.is_dir() && !dirs.iter().any(|existing| existing == &directory) {
        dirs.push(directory);
    }
}

fn executable_extensions(executable: &str) -> Vec<String> {
    if !cfg!(windows) || Path::new(executable).extension().is_some() {
        return vec![String::new()];
    }

    env::var("PATHEXT")
        .ok()
        .map(|value| {
            value
                .split(';')
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
                .collect::<Vec<_>>()
        })
        .filter(|extensions| !extensions.is_empty())
        .unwrap_or_else(|| {
            vec![
                ".COM".to_owned(),
                ".EXE".to_owned(),
                ".BAT".to_owned(),
                ".CMD".to_owned(),
            ]
        })
}

fn command_path_exists(path: &Path) -> bool {
    path.is_file()
}

fn launch_subject(executable: &str) -> String {
    if executable.is_empty() {
        String::new()
    } else {
        format!("（{}）", executable)
    }
}

#[cfg(test)]
mod tests {
    use super::{find_executable_in_dirs, push_existing_dir};
    use tempfile::tempdir;

    #[test]
    fn finds_executable_in_extra_search_directory() {
        let root = tempdir().expect("temp dir");
        let bin = root.path().join("bin");
        std::fs::create_dir_all(&bin).expect("bin dir");
        let command = bin.join("orchlet-test-cli");
        std::fs::write(&command, "").expect("command file");

        let found = find_executable_in_dirs("orchlet-test-cli", vec![bin]).expect("found command");

        assert_eq!(found, command);
    }

    #[test]
    fn skips_duplicate_and_missing_search_directories() {
        let root = tempdir().expect("temp dir");
        let bin = root.path().join("bin");
        std::fs::create_dir_all(&bin).expect("bin dir");
        let missing = root.path().join("missing");
        let mut dirs = Vec::new();

        push_existing_dir(&mut dirs, bin.clone());
        push_existing_dir(&mut dirs, bin.clone());
        push_existing_dir(&mut dirs, missing);

        assert_eq!(dirs, vec![bin]);
    }
}
