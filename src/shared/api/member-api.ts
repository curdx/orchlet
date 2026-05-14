import type {
  InviteMemberRequest,
  InviteMemberResult,
  ListMembersRequest,
  ListMembersResult,
  RemoveMemberRequest,
  RemoveMemberResult,
  UpdateMemberProfileRequest,
  UpdateMemberProfileResult,
  UpdateMemberStatusRequest,
  UpdateMemberStatusResult,
} from "../../contracts/generated/member";
import { invokeCommand } from "./client";

export type MemberApi = {
  listMembers: (request: ListMembersRequest) => Promise<ListMembersResult>;
  inviteMember: (request: InviteMemberRequest) => Promise<InviteMemberResult>;
  removeMember: (request: RemoveMemberRequest) => Promise<RemoveMemberResult>;
  updateMemberProfile: (
    request: UpdateMemberProfileRequest,
  ) => Promise<UpdateMemberProfileResult>;
  updateMemberStatus: (
    request: UpdateMemberStatusRequest,
  ) => Promise<UpdateMemberStatusResult>;
};

export const memberApi: MemberApi = {
  listMembers(request) {
    return invokeCommand<ListMembersResult>("members_list", { request });
  },

  inviteMember(request) {
    return invokeCommand<InviteMemberResult>("member_invite", { request });
  },

  removeMember(request) {
    return invokeCommand<RemoveMemberResult>("member_remove", { request });
  },

  updateMemberProfile(request) {
    return invokeCommand<UpdateMemberProfileResult>("member_profile_update", { request });
  },

  updateMemberStatus(request) {
    return invokeCommand<UpdateMemberStatusResult>("member_status_update", { request });
  },
};
