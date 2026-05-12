use std::{
    io::Read,
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
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 30,
                cols: 120,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(pty_launch_error("openpty"))?;
        let reader = pair
            .master
            .try_clone_reader()
            .map_err(pty_launch_error("cloneReader"))?;
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
            child: Mutex::new(child),
            _reader_thread: reader_thread,
        }))
    }
}

struct PtyTerminalSession {
    _master: Box<dyn MasterPty + Send>,
    child: Mutex<Box<dyn Child + Send + Sync>>,
    _reader_thread: JoinHandle<()>,
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

fn command_builder(profile: &TerminalLaunchProfile) -> CommandBuilder {
    if !profile.use_shell_wrapper {
        return CommandBuilder::new(&profile.command);
    }

    if cfg!(windows) {
        let mut command = CommandBuilder::new(
            std::env::var("COMSPEC")
                .ok()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "cmd.exe".to_owned()),
        );
        command.args(["/K", profile.command.as_str()]);
        return command;
    }

    let shell = default_shell_command();
    let mut command = CommandBuilder::new(shell);
    command.args(["-lc", profile.command.as_str()]);
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
        AppError::recoverable_error(
            "terminal.pty.launchFailed",
            "无法启动终端会话。",
            "请检查工作区路径和运行时命令是否可用后重试。",
            Some(format!("stage={} error={}", stage, error)),
        )
    }
}
