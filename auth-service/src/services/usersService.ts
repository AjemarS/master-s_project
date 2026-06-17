// usersService.ts
import { auth } from "../auth";

const getUsers = async (query: Record<string, any>, headers?: Headers) => {
  // Map express query params to Better Auth listUsers format
  const betterAuthQuery: Record<string, any> = {};
  if (query.search) betterAuthQuery.search = query.search as string;
  if (query.limit) betterAuthQuery.limit = parseInt(query.limit as string, 10);
  if (query.offset) betterAuthQuery.offset = parseInt(query.offset as string, 10);
  return await auth.api.listUsers({ query: betterAuthQuery, headers });
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
