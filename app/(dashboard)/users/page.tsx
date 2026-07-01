"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSidebar } from "@/context/SidebarContext";
import Drawer from "@/components/shared/Drawer";
import Modal from "@/components/shared/Modal";
import axios from "axios";
import {
  FaBars,
  FaBell,
  FaMoon,
  FaSun,
  FaSearch,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaShieldAlt,
  FaUserTie,
  FaWrench,
} from "react-icons/fa";
import PageHeader from "@/components/shared/PageHeader";
import { useSearchParams } from "next/navigation";

type User = {
  User_ID: number;
  FullName: string;
  Username: string;
  Email: string;
  Role: "Admin" | "Front Desk" | "Mechanic";
  CreatedAt: string;
  Mechanic_ID: number | null;
  Specialization: string | null;
  mechanicContact: string | null;
};

type FormState = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: string;
  specialization: string;
  contactNumber: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

const ROLES = ["Admin", "Front Desk", "Mechanic"] as const;

const ROLE_ICONS = {
  Admin: FaShieldAlt,
  "Front Desk": FaUserTie,
  Mechanic: FaWrench,
} as const;

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function RoleBadge({ role, primary }: { role: string; primary: string }) {
  return (
    <span
      className="text-[10px] font-medium px-2 py-1 rounded-full"
      style={{ color: primary, backgroundColor: primary + "20" }}
    >
      {role}
    </span>
  );
}

function Avatar({ name, primary }: { name: string; primary: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
      style={{ backgroundColor: primary + "20", color: primary }}
    >
      {initials}
    </div>
  );
}


function UserForm({
  initial,
  isEdit,
  onSubmit,
  onCancel,
  loading,
  dark,
  text,
  muted,
  border,
  primary,
}: {
  initial?: Partial<FormState>;
  isEdit?: boolean;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  loading: boolean;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  primary: string;
}) {
  const [form, setForm] = useState<FormState>({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "Front Desk",
    specialization: "",
    contactNumber: "",
    ...initial,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;
  const selectCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors
    ${dark ? "border-white/10 text-white bg-[#111318]" : "border-gray-200 text-gray-900 bg-white"}`;

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
    };

  const validate = () => {
    const e: FormErrors = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!isEdit && !form.password) e.password = "Password is required";
    else if (form.password && form.password.length < 8)
      e.password = "Minimum 8 characters";
    if (!form.role) e.role = "Role is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5 col-span-2">
          <p className={`text-xs ${muted}`}>Full Name</p>
          <input
            className={inputCls}
            placeholder="Juan Dela Cruz"
            value={form.fullName}
            onChange={set("fullName")}
          />
          {errors.fullName && (
            <p className="text-red-400 text-xs">{errors.fullName}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Username</p>
          <input
            className={inputCls}
            placeholder="juandc"
            value={form.username}
            onChange={set("username")}
          />
          {errors.username && (
            <p className="text-red-400 text-xs">{errors.username}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Role</p>
          <select
            className={selectCls}
            value={form.role}
            onChange={set("role")}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {errors.role && <p className="text-red-400 text-xs">{errors.role}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Email</p>
        <input
          className={inputCls}
          type="email"
          placeholder="juan@example.com"
          value={form.email}
          onChange={set("email")}
        />
        {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          {isEdit ? "New Password" : "Password"}{" "}
          {isEdit && (
            <span className={muted}>(leave blank to keep current)</span>
          )}
        </p>
        <div className="relative">
          <input
            className={inputCls}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={form.password}
            onChange={set("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${muted} hover:text-white transition-colors`}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-400 text-xs">{errors.password}</p>
        )}
      </div>

      {form.role === "Mechanic" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <p className={`text-xs ${muted}`}>
              Specialization <span className={muted}>(optional)</span>
            </p>
            <input
              className={inputCls}
              placeholder="Engine, Brakes..."
              value={form.specialization}
              onChange={set("specialization")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className={`text-xs ${muted}`}>
              Contact No. <span className={muted}>(optional)</span>
            </p>
            <input
              className={inputCls}
              placeholder="09171234567"
              value={form.contactNumber}
              onChange={set("contactNumber")}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors
            ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-900"}`}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (validate()) onSubmit(form);
          }}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
        </button>
      </div>
    </div>
  );
}

function UserDrawerContent({
  user,
  onEdit,
  onDelete,
  dark,
  text,
  muted,
  border,
  primary,
}: {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  primary: string;
}) {
  const RoleIcon = ROLE_ICONS[user.Role] ?? ROLE_ICONS["Front Desk"];

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0"
          style={{ backgroundColor: primary + "20", color: primary }}
        >
          {user.FullName.split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <div>
          <p className={`text-sm font-semibold ${text}`}>{user.FullName}</p>
          <p className={`text-xs ${muted}`}>@{user.Username}</p>
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{ backgroundColor: primary + "15" }}
      >
        <RoleIcon size={12} style={{ color: primary }} />
        <span className="text-xs font-medium" style={{ color: primary }}>
          {user.Role}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted}`}>Email</p>
          <p className={`text-xs font-medium mt-0.5 ${text}`}>{user.Email}</p>
        </div>
        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted}`}>Member Since</p>
          <p className={`text-xs font-medium mt-0.5 ${text}`}>
            {new Date(user.CreatedAt).toLocaleDateString("en-PH", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {user.Role === "Mechanic" && (
          <>
            {user.Specialization && (
              <div
                className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}
              >
                <p className={`text-[10px] ${muted}`}>Specialization</p>
                <p className={`text-xs font-medium mt-0.5 ${text}`}>
                  {user.Specialization}
                </p>
              </div>
            )}
            {user.mechanicContact && (
              <div
                className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}
              >
                <p className={`text-[10px] ${muted}`}>Contact</p>
                <p className={`text-xs font-medium mt-0.5 ${text}`}>
                  {user.mechanicContact}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors
            ${dark ? "border-white/10 text-gray-300 hover:text-white" : "border-gray-200 text-gray-600 hover:text-gray-900"}`}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 py-2 rounded-xl text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { dark, toggleTheme, primaryColor } = useTheme();
  const { setOpen } = useSidebar();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [drawerUser, setDrawerUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const limit = 10;
  const totalPages = Math.ceil(total / limit);
  const isDrawerOpen = drawerUser !== null;

  const innerBg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";
  const card = dark
    ? "bg-[#111318] border-white/5"
    : "bg-white border-gray-100";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const divide = dark
    ? "divide-white/5 border-white/5"
    : "divide-gray-100 border-gray-100";
  const border = dark ? "border-white/5" : "border-gray-100";
  const thBg = dark ? "bg-white/3" : "bg-gray-50";
  const hoverRow = dark ? "hover:bg-white/3" : "hover:bg-gray-50";
  const selectCls = `rounded-xl border px-3 py-2 text-xs outline-none transition-colors
    ${dark ? "border-white/10 text-white bg-[#111318]" : "border-gray-200 text-gray-700 bg-white"}`;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/users", {
        params: { search, page, role: roleFilter },
      });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [search, page, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleAdd = async (data: FormState) => {
    setFormLoading(true);
    setServerError("");
    try {
      await axios.post("/api/v1/users", {
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        specialization: data.specialization || undefined,
        contactNumber: data.contactNumber || undefined,
      });
      setShowAdd(false);
      fetchUsers();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to create user.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data: FormState) => {
    if (!editTarget) return;
    setFormLoading(true);
    setServerError("");
    try {
      await axios.put(`/api/v1/users/${editTarget.User_ID}`, {
        fullName: data.fullName || undefined,
        username: data.username || undefined,
        email: data.email || undefined,
        password: data.password || undefined,
        role: data.role || undefined,
        specialization: data.specialization || undefined,
        contactNumber: data.contactNumber || undefined,
      });
      setEditTarget(null);
      setDrawerUser(null);
      fetchUsers();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to update user.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/v1/users/${id}`);
      setDeleteTarget(null);
      setDrawerUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to delete user.");
    }
  };

  const roleCounts = ROLES.reduce(
    (acc, r) => {
      acc[r] = users.filter((u) => u.Role === r).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setSearchInput(q);
      setSearch(q);
    }
  }, []);

  return (
    <div suppressHydrationWarning className="flex-1 flex relative min-h-0">
      <div
        className={`flex-1 flex flex-col min-h-0 ${innerBg} ${text} transition-[filter] duration-300`}
        style={{ filter: isDrawerOpen ? "blur(3px)" : "none" }}
      >
        <PageHeader title="Users" />

        <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto min-h-0 [&>*]:shrink-0">
          {error && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${dark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className={`text-lg font-semibold ${text}`}>Users</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>
                {total} team member{total !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-30 ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
                  >
                    <FaChevronLeft size={10} />
                  </button>
                  <span className={`text-xs ${muted}`}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-30 ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
                  >
                    <FaChevronRight size={10} />
                  </button>
                </div>
              )}
              <select
                className={selectCls}
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setShowAdd(true);
                  setServerError("");
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <FaPlus size={11} />
                Add User
              </button>
            </div>
          </div>

          {/* role stat pills */}
          <div className="flex gap-3 flex-wrap">
            {ROLES.map((r) => {
              const RoleIcon = ROLE_ICONS[r];
              const active = roleFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => {
                    setRoleFilter(active ? "" : r);
                    setPage(1);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    backgroundColor: active
                      ? primaryColor
                      : primaryColor + "15",
                    color: active ? "#fff" : primaryColor,
                  }}
                >
                  <RoleIcon size={11} />
                  {r}
                  <span className="ml-0.5 opacity-70">
                    {roleCounts[r] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={thBg}>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    User
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden sm:table-cell`}
                  >
                    Username
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Email
                  </th>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Role
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden lg:table-cell`}
                  >
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divide}`}>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !users.length ? (
                  <tr>
                    <td
                      colSpan={5}
                      className={`px-5 py-12 text-center ${muted}`}
                    >
                      {search
                        ? `No users matching "${search}"`
                        : "No users yet."}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.User_ID}
                      onClick={() => setDrawerUser(u)}
                      className={`cursor-pointer transition-colors ${hoverRow}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.FullName} primary={primaryColor} />
                          <div>
                            <p className={`font-medium ${text}`}>
                              {u.FullName}
                            </p>
                            {u.Role === "Mechanic" && u.Specialization && (
                              <p className={`text-[10px] ${muted}`}>
                                {u.Specialization}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-5 py-3 font-mono ${muted} hidden sm:table-cell`}
                      >
                        @{u.Username}
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden md:table-cell`}>
                        {u.Email}
                      </td>
                      <td className="px-5 py-3">
                        <RoleBadge role={u.Role} primary={primaryColor} />
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden lg:table-cell`}>
                        {new Date(u.CreatedAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>

        {showAdd && (
          <Modal
            title="Add User"
            onClose={() => setShowAdd(false)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <UserForm
              onSubmit={handleAdd}
              onCancel={() => setShowAdd(false)}
              loading={formLoading}
              dark={dark}
              text={text}
              muted={muted}
              border={border}
              primary={primaryColor}
            />
          </Modal>
        )}

        {editTarget && (
          <Modal
            title="Edit User"
            onClose={() => setEditTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <UserForm
              isEdit
              initial={{
                fullName: editTarget.FullName,
                username: editTarget.Username,
                email: editTarget.Email,
                password: "",
                role: editTarget.Role,
                specialization: editTarget.Specialization ?? "",
                contactNumber: editTarget.mechanicContact ?? "",
              }}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
              loading={formLoading}
              dark={dark}
              text={text}
              muted={muted}
              border={border}
              primary={primaryColor}
            />
          </Modal>
        )}

        {deleteTarget !== null && (
          <Modal
            title="Delete User"
            onClose={() => setDeleteTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            <div className="p-5 flex flex-col gap-4">
              <p className={`text-sm ${muted}`}>
                Delete <span className={text}>{deleteTarget.FullName}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget.User_ID)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>

      <Drawer
        open={isDrawerOpen}
        onClose={() => setDrawerUser(null)}
        title="User Profile"
        dark={dark}
        card={card}
        text={text}
        border={border}
      >
        {drawerUser !== null && (
          <UserDrawerContent
            user={drawerUser}
            onEdit={() => {
              setEditTarget(drawerUser);
              setDrawerUser(null);
            }}
            onDelete={() => {
              setDeleteTarget(drawerUser);
              setDrawerUser(null);
            }}
            dark={dark}
            text={text}
            muted={muted}
            border={border}
            primary={primaryColor}
          />
        )}
      </Drawer>
    </div>
  );
}
