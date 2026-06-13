// usersService.ts
import { auth } from "../auth";

const getUsers = async (query: Parameters<typeof auth.api.listUsers>[0]["query"]) => {
  return await auth.api.listUsers({ query });
};

const getUserById = async (userId: string) => {
  return await auth.api.getUser({ query: { id: userId } });
};

const createUser = async (email: string, password: string, name: string) => {
  return await auth.api.createUser({
    body: {
      email: email,
      password: password,
      name: name,
      role: "user",
      data: { status: "active" },
    },
  });
};

const updateUser = async (userId: string, data: {}) => {
  return await auth.api.adminUpdateUser({ body: { userId, data } });
};

const removeUser = async (userId: string) => {
  return await auth.api.removeUser({ body: { userId } });
};

const getUserSessions = async (userId: string) => {
  return await auth.api.listUserSessions({ body: { userId } });
};

const setUserRole = async (userId: string, role: "admin" | "user", headers: Headers) => {
  return await auth.api.setRole({ body: { userId, role }, headers });
};

export { getUsers, getUserById, createUser, updateUser, removeUser, getUserSessions, setUserRole };
