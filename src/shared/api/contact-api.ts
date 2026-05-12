import type {
  CreateContactRequest,
  CreateContactResult,
  DeleteContactRequest,
  DeleteContactResult,
  ListContactsRequest,
  ListContactsResult,
  UpdateContactRequest,
  UpdateContactResult,
} from "../../contracts/generated/contact";
import { invokeCommand } from "./client";

export type ContactApi = {
  listContacts: (request: ListContactsRequest) => Promise<ListContactsResult>;
  createContact: (request: CreateContactRequest) => Promise<CreateContactResult>;
  updateContact: (request: UpdateContactRequest) => Promise<UpdateContactResult>;
  deleteContact: (request: DeleteContactRequest) => Promise<DeleteContactResult>;
};

export const contactApi: ContactApi = {
  listContacts(request) {
    return invokeCommand<ListContactsResult>("contacts_list", { request });
  },

  createContact(request) {
    return invokeCommand<CreateContactResult>("contact_create", { request });
  },

  updateContact(request) {
    return invokeCommand<UpdateContactResult>("contact_update", { request });
  },

  deleteContact(request) {
    return invokeCommand<DeleteContactResult>("contact_delete", { request });
  },
};
