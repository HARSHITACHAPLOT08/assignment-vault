type Role = "viewer" | "owner";

type LoginResponse = {
  token: string;
  role: Role;
  name: string;
  expiresAt: number;
};

const API_BASE = "/api";

// Known passcodes (front-end fallback)
const VIEWER_PASS = "H@rshi";
const OWNER_PASS = "ch@plot";

import { seedAssignments, AssignmentCard } from "./data/subjects";

function makeToken(name: string, role: Role) {
  return btoa(`${name}:${role}:${Date.now()}`);
}

function storageKey() {
  return "av-uploads";
}

function readLocalUploads(): AssignmentCard[] {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : seedAssignments.slice();
  } catch {
    return seedAssignments.slice();
  }
}

function writeLocalUploads(items: AssignmentCard[]) {
  localStorage.setItem(storageKey(), JSON.stringify(items));
}

export async function login(name: string, passcode: string): Promise<LoginResponse> {
  // Try reaching real backend first
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, passcode })
    });
    if (res.ok) return res.json();
  } catch (e) {
    // network failed — fall through to local logic
  }

  // Local fallback: dual-passcode logic
  const trimmed = (passcode || "").trim();
  if (trimmed === VIEWER_PASS) {
    return Promise.resolve({
      token: makeToken(name || "Viewer", "viewer"),
      role: "viewer",
      name: name || "Viewer",
      expiresAt: Date.now() + 1000 * 60 * 30 // 30 minutes
    });
  }
  if (trimmed === OWNER_PASS) {
    return Promise.resolve({
      token: makeToken(name || "Owner", "owner"),
      role: "owner",
      name: name || "Owner",
      expiresAt: Date.now() + 1000 * 60 * 30
    });
  }

  return Promise.reject(new Error("Invalid passcode"));
}

export async function fetchAssignments(token: string) {
  try {
    const res = await fetch(`${API_BASE}/uploads`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) return res.json();
  } catch (e) {
    // ignore and use local
  }
  // Local: return stored uploads
  return { items: readLocalUploads() };
}

export async function uploadAssignment(form: FormData, token: string) {
  try {
    const res = await fetch(`${API_BASE}/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    if (res.ok) return res.json();
  } catch (e) {
    // fallback
  }

  // Local upload handling
  const subject = (form.get("subject") as string) || "Uncategorized";
  const title = (form.get("title") as string) || "Untitled upload";
  const description = (form.get("description") as string) || "";
  const file = form.get("file") as File | null;

  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const uploadedAt = new Date().toISOString();
  let fileType: "image" | "pdf" = "pdf";
  let url = "#";
  let preview: string | undefined = undefined;

  if (file) {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
      fileType = "image";
      preview = URL.createObjectURL(file);
      url = preview;
    } else if (name.endsWith(".pdf")) {
      fileType = "pdf";
      // create object URL for download preview
      url = URL.createObjectURL(file);
    }
  }

  const item: AssignmentCard = {
    id,
    subject,
    title,
    description,
    uploadedAt,
    fileType,
    url,
    preview
  };

  const existing = readLocalUploads();
  existing.unshift(item);
  writeLocalUploads(existing);

  return { item };
}

export async function deleteAssignment(id: string, token: string) {
  try {
    const res = await fetch(`${API_BASE}/uploads/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) return res.json();
  } catch (e) {
    // fallback
  }

  const items = readLocalUploads().filter((it) => it.id !== id);
  writeLocalUploads(items);
  return { ok: true };
}
