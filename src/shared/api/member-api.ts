import type {
  InviteMemberRequest,
  InviteMemberResult,
  ListMembersRequest,
  ListMembersResult,
  RemoveMemberRequest,
  RemoveMemberResult,
  UpdateMemberStatusRequest,
  UpdateMemberStatusResult,
} from "../../contracts/generated/member";
import { invokeCommand } from "./client";

export type MemberApi = {
  listMembers: (request: ListMembersRequest) => Promise<ListMembersResult>;
  inviteMember: (request: InviteMemberRequest) => Promise<InviteMemberResult>;
  removeMember: (request: RemoveMemberRequest) => Promise<RemoveMemberResult>;
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

  updateMemberStatus(request) {
    return invokeCommand<UpdateMemberStatusResult>("member_status_update", { request });
  },
};
