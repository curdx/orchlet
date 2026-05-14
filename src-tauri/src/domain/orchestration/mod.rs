use crate::{
    contracts::{
        AppError, ChatMessageProfile, ConversationKind, ConversationParticipantKind,
        ConversationProfile, DispatchTargetResolutionProfile, DispatchTargetResolutionSource,
        MemberProfile, MemberRuntimeKind,
    },
    domain::{
        chat::{validate_conversation_id, validate_message_id},
        member::{validate_member_id, validate_workspace_id},
    },
};

pub const DISPATCH_SCHEMA_VERSION: u32 = 1;

pub fn validate_dispatch_scope(
    active_workspace_id: &str,
    request_workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
) -> Result<(), AppError> {
    validate_workspace_id(request_workspace_id)?;
    validate_conversation_id(conversation_id)?;
    validate_message_id(message_id)?;

    if active_workspace_id == request_workspace_id {
        return Ok(());
    }

    Err(AppError::recoverable_error(
        "dispatch.workspace.mismatch",
        "派发请求不属于当前工作区。",
        "请刷新工作区上下文后重试。",
        Some(format!(
            "activeWorkspaceId={} requestWorkspaceId={}",
            active_workspace_id, request_workspace_id
        )),
    ))
}

pub fn resolve_dispatch_target(
    requested_member_id: Option<&str>,
    mentioned_member_ids: &[String],
    conversation: &ConversationProfile,
    members: &[MemberProfile],
) -> Result<DispatchTargetResolutionProfile, AppError> {
    if let Some(member_id) = requested_member_id {
        validate_member_id(member_id)?;
        let member = terminal_capable_member(members, member_id)?;
        return Ok(target_resolution(
            member,
            DispatchTargetResolutionSource::UserSelected,
            format!("用户选择了派发目标 {}。", member.instance_label),
        ));
    }

    let mentioned_candidates = terminal_capable_candidates(mentioned_member_ids, members)?;
    if !mentioned_member_ids.is_empty() {
        return match mentioned_candidates.as_slice() {
            [member] => Ok(target_resolution(
                member,
                DispatchTargetResolutionSource::ExplicitMention,
                format!("消息明确提及 {}。", member.instance_label),
            )),
            [] => Err(target_required_error(
                "消息提及的成员没有可用终端运行时。",
                mentioned_member_ids.len(),
            )),
            _ => Err(ambiguous_target_error(
                "消息提及了多个可派发成员。",
                &mentioned_candidates,
            )),
        };
    }

    if conversation.kind == ConversationKind::Private
        && matches!(
            conversation.participant_kind.as_ref(),
            Some(ConversationParticipantKind::Member)
        )
    {
        if let Some(participant_id) = conversation.participant_id.as_deref() {
            if let Ok(member) = terminal_capable_member(members, participant_id) {
                return Ok(target_resolution(
                    member,
                    DispatchTargetResolutionSource::PrivateConversation,
                    format!("当前私聊对象 {} 是本次发送目标。", member.instance_label),
                ));
            }
        }
    }

    let conversation_member_ids = conversation
        .members
        .iter()
        .map(|member| member.member_id.clone())
        .collect::<Vec<_>>();
    let conversation_candidates = terminal_capable_candidates(&conversation_member_ids, members)?;
    match conversation_candidates.as_slice() {
        [member] => {
            return Ok(target_resolution(
                member,
                DispatchTargetResolutionSource::ConversationDefault,
                format!(
                    "当前会话只有一个可运行终端的成员：{}。",
                    member.instance_label
                ),
            ));
        }
        candidates if candidates.len() > 1 => {
            return Err(ambiguous_target_error(
                "当前会话有多个可派发成员。",
                candidates,
            ));
        }
        _ => {}
    }

    let workspace_candidates = members
        .iter()
        .filter(|member| is_terminal_capable_member(member))
        .collect::<Vec<_>>();
    match workspace_candidates.as_slice() {
        [member] => Ok(target_resolution(
            member,
            DispatchTargetResolutionSource::WorkspaceDefault,
            format!(
                "当前工作区只有一个可运行终端的成员：{}。",
                member.instance_label
            ),
        )),
        [] => Err(target_required_error("没有可派发的终端成员。", 0)),
        candidates => Err(ambiguous_target_error(
            "当前工作区有多个可派发成员。",
            candidates,
        )),
    }
}

pub fn plan_send_dispatch_targets(
    mention_all: bool,
    message: &ChatMessageProfile,
    conversation: &ConversationProfile,
    members: &[MemberProfile],
) -> Vec<DispatchTargetResolutionProfile> {
    if conversation.kind == ConversationKind::Private
        && matches!(
            conversation.participant_kind.as_ref(),
            Some(ConversationParticipantKind::Member)
        )
    {
        return conversation
            .participant_id
            .as_deref()
            .and_then(|participant_id| {
                member_by_id(members, participant_id)
                    .filter(|member| member.member_id != message.author_member_id)
            })
            .map(|member| {
                target_resolution(
                    member,
                    DispatchTargetResolutionSource::PrivateConversation,
                    format!(
                        "当前私聊对象 {} 是可运行终端的成员。",
                        member.instance_label
                    ),
                )
            })
            .into_iter()
            .collect();
    }

    if mention_all {
        let member_ids =
            if conversation.members.is_empty() && conversation.kind == ConversationKind::Channel {
                members
                    .iter()
                    .map(|member| member.member_id.clone())
                    .collect::<Vec<_>>()
            } else {
                conversation
                    .members
                    .iter()
                    .map(|member| member.member_id.clone())
                    .collect::<Vec<_>>()
            };

        return fan_out_targets(
            &member_ids,
            &message.author_member_id,
            members,
            DispatchTargetResolutionSource::AllMention,
            |member| format!("@all 指向成员 {}。", member.instance_label),
        );
    }

    if !message.mentioned_member_ids.is_empty() {
        return fan_out_targets(
            &message.mentioned_member_ids,
            &message.author_member_id,
            members,
            DispatchTargetResolutionSource::ExplicitMention,
            |member| format!("消息明确提及 {}。", member.instance_label),
        );
    }

    Vec::new()
}

pub fn is_terminal_capable_member(member: &MemberProfile) -> bool {
    member.runtime.kind != MemberRuntimeKind::None
        && member
            .runtime
            .command
            .as_deref()
            .map(|command| !command.trim().is_empty())
            .unwrap_or(false)
}

fn fan_out_targets<F>(
    member_ids: &[String],
    sender_member_id: &str,
    members: &[MemberProfile],
    source: DispatchTargetResolutionSource,
    reason: F,
) -> Vec<DispatchTargetResolutionProfile>
where
    F: Fn(&MemberProfile) -> String,
{
    let mut targets = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for member_id in member_ids {
        if member_id == sender_member_id || !seen.insert(member_id) {
            continue;
        }

        if let Some(member) = member_by_id(members, member_id) {
            if source == DispatchTargetResolutionSource::AllMention
                && !member.permissions.can_mention
            {
                continue;
            }

            targets.push(target_resolution(member, source.clone(), reason(member)));
        }
    }

    targets
}

pub fn target_resolution_from_parts(
    member_id: String,
    source: DispatchTargetResolutionSource,
    reason: String,
) -> DispatchTargetResolutionProfile {
    DispatchTargetResolutionProfile {
        member_id,
        source,
        reason,
    }
}

fn target_resolution(
    member: &MemberProfile,
    source: DispatchTargetResolutionSource,
    reason: String,
) -> DispatchTargetResolutionProfile {
    target_resolution_from_parts(member.member_id.clone(), source, reason)
}

fn terminal_capable_member<'a>(
    members: &'a [MemberProfile],
    member_id: &str,
) -> Result<&'a MemberProfile, AppError> {
    let member = member_by_id(members, member_id).ok_or_else(|| {
        AppError::recoverable_error(
            "dispatch.target.notFound",
            "未找到派发目标成员。",
            "请刷新成员列表后重试。",
            Some(format!("memberId={}", member_id)),
        )
    })?;

    if is_terminal_capable_member(member) {
        Ok(member)
    } else {
        Err(AppError::recoverable_error(
            "dispatch.target.unavailable",
            "派发目标没有可用终端运行时。",
            "请选择配置了 CLI 或 Shell 运行时的成员。",
            Some(format!("memberId={}", member_id)),
        ))
    }
}

fn member_by_id<'a>(members: &'a [MemberProfile], member_id: &str) -> Option<&'a MemberProfile> {
    members.iter().find(|member| member.member_id == member_id)
}

fn terminal_capable_candidates<'a>(
    member_ids: &[String],
    members: &'a [MemberProfile],
) -> Result<Vec<&'a MemberProfile>, AppError> {
    let mut candidates = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for member_id in member_ids {
        validate_member_id(member_id)?;
        if !seen.insert(member_id) {
            continue;
        }

        if let Some(member) = members.iter().find(|member| member.member_id == *member_id) {
            if is_terminal_capable_member(member) {
                candidates.push(member);
            }
        }
    }

    Ok(candidates)
}

fn target_required_error(message: &str, mentioned_member_count: usize) -> AppError {
    AppError::recoverable_error(
        "dispatch.target.required",
        message,
        "请选择一名可运行终端的成员后再派发。",
        Some(format!("mentionedMemberCount={}", mentioned_member_count)),
    )
}

fn ambiguous_target_error(message: &str, candidates: &[&MemberProfile]) -> AppError {
    AppError::recoverable_error(
        "dispatch.target.ambiguous",
        message,
        "请从候选成员中选择一个派发目标。",
        Some(format!(
            "candidateMemberIds={}",
            candidates
                .iter()
                .map(|member| member.member_id.as_str())
                .collect::<Vec<_>>()
                .join(",")
        )),
    )
}

pub fn normalize_dispatch_payload(body: &str) -> String {
    if body.ends_with('\r') {
        body.to_owned()
    } else {
        format!("{}\r", body)
    }
}
