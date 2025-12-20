import { useEffect, useMemo, useState } from "react";
import { seedAssignments, theorySubjects, labSubjects, AssignmentCard } from "./data/subjects";
import { login, fetchAssignments, uploadAssignment, deleteAssignment } from "./api";
import {
  ShieldCheck,
  LockKeyhole,
  Sun,
  Moon,
  Search,
  Upload,
  Download,
  Trash2,
  Filter,
  LogOut,
  Sparkles
  , Eye, EyeOff
} from "lucide-react";

type Role = "viewer" | "owner";

type Session = {
  name: string;
  role: Role;
  token: string;
  expiresAt: number;
};

type UploadForm = {
  subject: string;
  title: string;
  description: string;
  file: File | null;
};

const palette = {
  deepBlue: "#0d1b2a",
  softViolet: "#7b6cff",
  offWhite: "#f5f7fb"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function App() {
  const [view, setView] = useState<"landing" | "login" | "dashboard" | "subject">("landing");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(() => {
    const cached = sessionStorage.getItem("av-session");
    return cached ? JSON.parse(cached) : null;
  });
  const [assignments, setAssignments] = useState<AssignmentCard[]>(seedAssignments);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | "all">("all");
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "image" | "pdf">("all");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadForm>({
    subject: theorySubjects[0],
    title: "",
    description: "",
    file: null
  });
  const [status, setStatus] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("av-theme");
    return stored === "dark" ? "dark" : "light";
  });

  const [showWatermark, setShowWatermark] = useState<boolean>(() => {
    const s = localStorage.getItem("av-watermark");
    return s === null ? true : s === "true";
  });

  const [fullView, setFullView] = useState<{ open: boolean; item: AssignmentCard | null }>({ open: false, item: null });

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("av-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("av-watermark", showWatermark ? "true" : "false");
  }, [showWatermark]);

  function openSubject(subject: string) {
    setSelectedSubject(subject);
    setView("subject");
  }

  function openFullView(item: AssignmentCard) {
    setFullView({ open: true, item });
  }

  function closeFullView() {
    setFullView({ open: false, item: null });
  }

  useEffect(() => {
    if (!session) return;
    sessionStorage.setItem("av-session", JSON.stringify(session));
    const timeLeft = session.expiresAt - Date.now();
    if (timeLeft <= 0) {
      handleLogout();
      return;
    }
    const timer = setTimeout(() => handleLogout(), timeLeft);
    return () => clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (session) {
      hydrateAssignments(session.token);
    }
  }, [session]);

  async function hydrateAssignments(token: string) {
    try {
      const data = await fetchAssignments(token);
      setAssignments(data.items ?? seedAssignments);
    } catch (err) {
      console.error(err);
      setStatus("Using local sample data until server responds.");
    }
  }

  async function handleLogin(name: string, passcode: string) {
    setLoading(true);
    setLoginError("");
    try {
      const response = await login(name, passcode);
      setSession({
        name: response.name,
        role: response.role,
        token: response.token,
        expiresAt: response.expiresAt
      });
      setView("dashboard");
      setStatus("Secure session started");
    } catch (error) {
      setLoginError("Calmly recheck your passcode. Access not granted yet.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setSession(null);
    sessionStorage.removeItem("av-session");
    setStatus("Session closed. Stay secure.");
    setView("landing");
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || session.role !== "owner") return;
    if (!uploadForm.file) {
      setStatus("Please attach an image or PDF");
      return;
    }
    const form = new FormData();
    form.append("subject", uploadForm.subject);
    form.append("title", uploadForm.title || "Untitled upload");
    form.append("description", uploadForm.description);
    form.append("file", uploadForm.file);
    try {
      const created = await uploadAssignment(form, session.token);
      setAssignments((prev) => [created.item, ...prev].sort(sortByDate));
      setUploadOpen(false);
      setUploadForm({ subject: theorySubjects[0], title: "", description: "", file: null });
      setStatus("Upload stored securely");
    } catch (err: any) {
      setStatus(err?.message || "Upload failed");
    }
  }

  function sortByDate(a: AssignmentCard, b: AssignmentCard) {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  }

  async function handleDelete(id: string) {
    if (!session || session.role !== "owner") return;
    const confirmed = window.confirm("Delete this upload? This action cannot be undone.");
    if (!confirmed) return;
    try {
      await deleteAssignment(id, session.token);
      setAssignments((prev) => prev.filter((item) => item.id !== id));
      setStatus("Upload removed");
    } catch (err: any) {
      setStatus(err?.message || "Delete failed");
    }
  }

  const filtered = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return assignments
      .filter((item) => (subjectFilter === "all" ? true : item.subject === subjectFilter))
      .filter((item) => (fileTypeFilter === "all" ? true : item.fileType === fileTypeFilter))
      .filter((item) =>
        [item.subject, item.title, item.description].some((field) =>
          field.toLowerCase().includes(query)
        )
      )
      .sort(sortByDate);
  }, [assignments, searchTerm, subjectFilter, fileTypeFilter]);

  const recent = filtered.slice(0, 3);

  function Landing() {
    return (
      <div className="layout">
        <header className="hero">
          <div className="hero__badge">Quiet discipline</div>
          <h1>Assignment Vault</h1>
          <p>
            Curated, secure, and calm space for Techno NJR batchmates. Only the trusted passcodes open
            the shelves.
          </p>
          <div className="hero__actions">
            <button className="btn primary" onClick={() => setView("login")}>Enter vault</button>
            <button className="btn ghost" onClick={() => setView("login")}>View-only access</button>
          </div>
        </header>
        <section className="highlight">
          <div className="stat">
            <ShieldCheck size={20} />
            <div>
              <span className="stat__label">Dual-passcode</span>
              <span className="stat__value">Owner + Viewer</span>
            </div>
          </div>
          <div className="stat">
            <LockKeyhole size={20} />
            <div>
              <span className="stat__label">Session auto-expiry</span>
              <span className="stat__value">Timed tokens</span>
            </div>
          </div>
          <div className="stat">
            <Sparkles size={20} />
            <div>
              <span className="stat__label">Organized excellence</span>
              <span className="stat__value">Theory + Labs</span>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  function Login() {
    const [name, setName] = useState("");
    const [passcode, setPasscode] = useState("");

    return (
      <div className="layout login">
        <div className="glass">
          <h2>Authenticate quietly</h2>
          <p className="muted">Enter your student name and passcode to continue.</p>
          <form
            className={classNames("stack", loginError && "shake")}
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(name, passcode);
            }}
          >
            <label className="field">
              <span>Student Name</span>
              <input
                placeholder="e.g., Harshita Chaplot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Passcode</span>
              <input
                type="password"
                placeholder="Viewer: H@rshi | Owner: ch@plot"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
              />
            </label>
            {loginError && <div className="error">{loginError}</div>}
            <button className="btn primary full" disabled={loading} type="submit">
              {loading ? "Checking..." : "Unlock"}
            </button>
            <button className="btn ghost full" type="button" onClick={() => setView("landing")}>Back</button>
          </form>
          <Footer />
        </div>
      </div>
    );
  }

  function Dashboard() {
    return (
      <div className="page">
        <header className="topbar">
          <div>
            <p className="muted">Assignment Vault</p>
            <h2>Welcome, {session?.name || "Student"}</h2>
          </div>
          <div className="topbar__actions">
            <div className="pill">Role: {session?.role === "owner" ? "Owner" : "Viewer"}</div>
            <button className="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle theme">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="icon"
              onClick={() => setShowWatermark((s) => !s)}
              aria-label="Toggle watermark"
              title={showWatermark ? 'Hide watermark' : 'Show watermark'}
            >
              {showWatermark ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button className="icon" onClick={handleLogout} aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <section className="controls">
          <div className="search">
            <Search size={18} />
            <input
              placeholder="Search subjects, titles, or descriptions"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filters">
            <div className="chip">Global search</div>
            <div className="chip">
              <Filter size={14} />
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="all">All subjects</option>
                {theorySubjects.concat(labSubjects).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="chip">
              <select value={fileTypeFilter} onChange={(e) => setFileTypeFilter(e.target.value as any)}>
                <option value="all">All file types</option>
                <option value="image">Images</option>
                <option value="pdf">PDFs</option>
              </select>
            </div>
            {session?.role === "owner" && (
              <button className="btn primary" onClick={() => setUploadOpen(true)}>
                <Upload size={16} /> Upload
              </button>
            )}
          </div>
        </section>

        <section className="grid two">
          <Card
            title="Theory"
            subtitle="Structured clarity"
            items={filtered.filter((i) => theorySubjects.includes(i.subject))}
            showWatermark={showWatermark}
            onOpenSubject={openSubject}
            onOpenFullView={openFullView}
          />
          <Card
            title="Practicals"
            subtitle="Hands-on labs"
            items={filtered.filter((i) => labSubjects.includes(i.subject))}
            showWatermark={showWatermark}
            onOpenSubject={openSubject}
            onOpenFullView={openFullView}
          />
        </section>

        <section className="grid one">
          <div className="panel">
            <div className="panel__head">
              <div>
                <p className="muted">Recently uploaded</p>
                <h3>Fresh entries</h3>
              </div>
            </div>
            <div className="recent">
              {recent.map((item) => (
                <div key={item.id} className="recent__item">
                  <div>
                    <p className="muted">{item.subject}</p>
                    <strong>{item.title}</strong>
                    <p className="muted small">{formatDate(item.uploadedAt)}</p>
                  </div>
                  <a className="btn ghost" href={item.url === "#" ? undefined : item.url} download>
                    <Download size={16} /> Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Footer />

        {uploadOpen && session?.role === "owner" && (
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal__body">
              <div className="modal__head">
                <h3>Upload assignment</h3>
                <button className="icon" onClick={() => setUploadOpen(false)} aria-label="Close">
                  ×
                </button>
              </div>
              <form className="stack" onSubmit={handleUploadSubmit}>
                <label className="field">
                  <span>Subject</span>
                  <select
                    value={uploadForm.subject}
                    onChange={(e) => setUploadForm((f) => ({ ...f, subject: e.target.value }))}
                  >
                    {theorySubjects.concat(labSubjects).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Title</span>
                  <input
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Concise title"
                    required
                  />
                </label>
                <label className="field">
                  <span>Description</span>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="One-line context"
                  />
                </label>
                <DragAndDrop
                  file={uploadForm.file}
                  onFile={(file) => setUploadForm((f) => ({ ...f, file }))}
                />
                <p className="muted small">
                  Allowed: .jpg, .jpeg, .png, .pdf. Owner-only actions. Files auto-sort by date.
                </p>
                <button className="btn primary" type="submit">
                  <Upload size={16} /> Save upload
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app" style={{ background: `radial-gradient(circle at 20% 20%, rgba(123,108,255,0.08), transparent), radial-gradient(circle at 80% 0%, rgba(13,27,42,0.15), transparent)` }}>
      {view === "landing" && <Landing />}
      {view === "login" && <Login />}
      {view === "dashboard" && <Dashboard />}
      {view === "subject" && selectedSubject && (
        <div className="page">
          <header className="topbar">
            <div>
              <p className="muted">Subject</p>
              <h2>{selectedSubject}</h2>
            </div>
            <div className="topbar__actions">
              <button className="btn ghost" onClick={() => setView('dashboard')}>Back</button>
            </div>
          </header>
          <section className="panel">
            <div className="cards">
              {assignments.filter(a => a.subject === selectedSubject).map(item => (
                <div key={item.id} style={{maxWidth:720, margin:'8px auto'}}>
                  <div className="card">
                    <div className="card__preview" style={{height:320}}>
                      <div className={classNames('watermark')}>Harshita Chaplot</div>
                      {item.preview ? <img src={item.preview} alt={item.title} /> : <div className="card__placeholder">Preview</div>}
                    </div>
                    <div className="card__body">
                      <p className="muted small">{item.subject}</p>
                      <h3>{item.title}</h3>
                      <p className="muted">{item.description}</p>
                      <div style={{display:'flex',gap:8,marginTop:12}}>
                        <button className="btn ghost" onClick={() => openFullView(item)}>View</button>
                        <a className="btn ghost" href={item.url === '#' ? undefined : item.url} download>Download</a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <Footer />
        </div>
      )}
      {status && <div className="status" onClick={() => setStatus(null)}>{status}</div>}

      {fullView.open && fullView.item && (
        <div className="modal" role="dialog" aria-modal="true" onClick={closeFullView}>
          <div className="modal__body" onClick={(e) => e.stopPropagation()} style={{maxWidth:'90vw', width: '900px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <h3 style={{margin:0}}>{fullView.item.title}</h3>
              <button className="btn ghost" onClick={closeFullView}>Close</button>
            </div>
            <div style={{height:'75vh'}}>
              {fullView.item.fileType === 'image' ? (
                <img src={fullView.item.url} alt={fullView.item.title} style={{width:'100%',height:'100%',objectFit:'contain'}} />
              ) : (
                <iframe src={fullView.item.url} title={fullView.item.title} style={{width:'100%',height:'100%'}} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, subtitle, items, showWatermark, onOpenSubject, onOpenFullView }: { title: string; subtitle: string; items: AssignmentCard[]; showWatermark: boolean; onOpenSubject?: (s: string) => void; onOpenFullView?: (i: AssignmentCard) => void }) {
  function handleTitleClick() {
    if (items.length > 0 && onOpenSubject) onOpenSubject(title === 'Theory' || title === 'Practicals' ? titleMapping(title) : title);
  }

  function titleMapping(title: string) {
    // map panel title to a reasonable subject label if possible; otherwise leave
    return title === 'Theory' ? theorySubjects[0] : title === 'Practicals' ? labSubjects[0] : title;
  }

  return (
    <div className="panel">
      <div className="panel__head">
        <div>
          <p className="muted">{subtitle}</p>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="cards">
        {items.map((item) => (
          <Assignment key={item.id} item={item} showWatermark={showWatermark} onOpenFullView={onOpenFullView} onOpenSubject={onOpenSubject} />
        ))}
        {items.length === 0 && <p className="muted">No uploads yet.</p>}
      </div>
    </div>
  );
}

function Assignment({ item, showWatermark, onOpenFullView, onOpenSubject }: { item: AssignmentCard; showWatermark: boolean; onOpenFullView?: (i: AssignmentCard) => void; onOpenSubject?: (s: string) => void }) {
  function openSubjectHere() {
    if (onOpenSubject) onOpenSubject(item.subject);
  }

  function openPreview() {
    if (onOpenFullView) onOpenFullView(item);
  }

  return (
    <div className="card">
      <div className="card__preview">
        <div className={classNames('watermark', !showWatermark && 'watermark--hidden')}>Harshita Chaplot</div>
        <div className="card__preview__overlay"></div>
        {item.preview ? (
          <img src={item.preview} alt={item.title} />
        ) : (
          <div className="card__placeholder">Preview</div>
        )}
      </div>
      <div className="card__body">
        <p className="muted small">{item.subject}</p>
        <h4>{item.title}</h4>
        <p className="muted">{item.description}</p>
        <div className="card__meta">
          <span>{item.fileType === "pdf" ? "PDF" : "Image"}</span>
          <span>{formatDate(item.uploadedAt)}</span>
        </div>
        <div className="card__actions">
          <button className="btn ghost" type="button" onClick={openPreview}>
            <Eye size={16} />
            View
          </button>
          <a className="btn ghost" href={item.url === "#" ? undefined : item.url} download>
            <Download size={16} />
            Download
          </a>
          <button className="btn ghost" onClick={openSubjectHere} type="button">
            {"Go to subject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DragAndDrop({ file, onFile }: { file: File | null; onFile: (file: File) => void }) {
  const [highlight, setHighlight] = useState(false);
  const text = file ? `${file.name} ready` : "Drop image or PDF here";
  return (
    <div
      className={classNames("dropzone", highlight && "dropzone--active")}
      onDragOver={(e) => {
        e.preventDefault();
        setHighlight(true);
      }}
      onDragLeave={() => setHighlight(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHighlight(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) onFile(dropped);
      }}
    >
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onFile(picked);
        }}
      />
      <Upload size={18} />
      <span>{text}</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        Harshita Chaplot
        <div className="muted small">Assignments curated & maintained by Harshita Chaplot</div>
      </div>
    </footer>
  );
}
