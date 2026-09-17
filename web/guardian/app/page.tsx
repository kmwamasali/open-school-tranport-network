"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "pending" | "approved" | "rejected";

type DocumentRecord = {
  id: string;
  kind: string;
  fileName: string;
  dataUrl: string;
  status: Status;
  submittedAt: string;
  reviewedAt?: string;
};

type ChildRecord = {
  id: string;
  displayName: string;
  pseudonymousId: string;
  schoolId?: string;
  verificationStatus: Status;
};

type ParentRecord = {
  id: string;
  name: string;
  phone: string;
  otpVerified: boolean;
  identityStatus: Status;
  schoolId?: string;
  children: ChildRecord[];
  documents: DocumentRecord[];
  createdAt: string;
};

type SchoolRecord = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  status: Status;
  documents: DocumentRecord[];
  createdAt: string;
};

type AppState = {
  parents: ParentRecord[];
  drivers: unknown[];
  schools: SchoolRecord[];
  vehicles: unknown[];
  audit: string[];
};

type UploadedFile = {
  fileName: string;
  dataUrl: string;
};

const STORAGE_KEY = "ostn.phase1.mvp";

const initialState: AppState = {
  parents: [],
  drivers: [],
  schools: [
    {
      id: "school-demo",
      name: "MaMa John Primary School",
      contactName: "School Registrar",
      phone: "+256700000001",
      status: "approved",
      documents: [],
      createdAt: new Date().toISOString()
    }
  ],
  vehicles: [],
  audit: ["MVP workspace created"]
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const pseudoStudentId = () =>
  `STU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function loadState(): AppState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return initialState;
  }
}

function readFile(file?: File | null): Promise<UploadedFile | undefined> {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ fileName: file.name, dataUrl: String(reader.result) });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function makeDocument(kind: string, upload?: UploadedFile): DocumentRecord[] {
  if (!upload) return [];
  return [{
    id: uid("doc"),
    kind,
    fileName: upload.fileName,
    dataUrl: upload.dataUrl,
    status: "pending",
    submittedAt: new Date().toISOString()
  }];
}

export default function GuardianPortal() {
  const [state, setState] = useState<AppState>(initialState);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const approvedSchools = state.schools.filter((school) => school.status === "approved");
  const parent = state.parents.find((item) => item.id === selectedParentId);
  const myChildren = useMemo(() => parent?.children ?? [], [parent]);

  function commit(updater: (current: AppState) => AppState, audit: string) {
    setState((current) => {
      const next = updater(current);
      return { ...next, audit: [`${new Date().toLocaleString()}: ${audit}`, ...next.audit] };
    });
    setMessage(audit);
  }

  async function registerParent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const upload = await readFile(form.get("document") as File);
    const record: ParentRecord = {
      id: uid("parent"),
      name: String(form.get("name")),
      phone: String(form.get("phone")),
      otpVerified: false,
      identityStatus: upload ? "pending" : "rejected",
      schoolId: String(form.get("schoolId")),
      children: [],
      documents: makeDocument("Parent identity", upload),
      createdAt: new Date().toISOString()
    };
    commit((current) => ({ ...current, parents: [...current.parents, record] }), `Guardian registration submitted for ${record.name}`);
    setSelectedParentId(record.id);
    event.currentTarget.reset();
  }

  function verifyOtp() {
    commit(
      (current) => ({
        ...current,
        parents: current.parents.map((item) =>
          item.id === selectedParentId ? { ...item, otpVerified: true } : item
        )
      }),
      "Phone verification completed"
    );
  }

  function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const child: ChildRecord = {
      id: uid("child"),
      displayName: String(form.get("displayName")),
      pseudonymousId: pseudoStudentId(),
      schoolId: String(form.get("schoolId")),
      verificationStatus: "pending"
    };
    commit(
      (current) => ({
        ...current,
        parents: current.parents.map((item) =>
          item.id === selectedParentId
            ? { ...item, schoolId: child.schoolId, children: [...item.children, child] }
            : item
        )
      }),
      `Child registered with minimal ID ${child.pseudonymousId}`
    );
    event.currentTarget.reset();
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Guardian Portal</p>
          <h1>Parent onboarding</h1>
        </div>
        <a className="nav-link" href="http://localhost:3002">School portal</a>
      </header>

      {message ? <p className="toast">{message}</p> : null}

      <section className="panel">
        <div className="panel-heading">
          <h2>Register and verify</h2>
          <p>Identity evidence is submitted for admin review. Child records use a pseudonymous student ID.</p>
        </div>
        <form onSubmit={registerParent} className="form-grid">
          <label>
            Parent name
            <input name="name" required placeholder="Amina Kato" />
          </label>
          <label>
            Phone
            <input name="phone" required placeholder="+256..." />
          </label>
          <label>
            School
            <select name="schoolId" required>
              {approvedSchools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </label>
          <label>
            Identity document
            <input name="document" type="file" accept="image/*,.pdf" required />
          </label>
          <button type="submit">Register</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>My account</h2>
          <p>Select a local demo guardian to continue phone verification and child registration.</p>
        </div>
        <div className="two-column">
          <section>
            <label>
              Guardian
              <select value={selectedParentId} onChange={(event) => setSelectedParentId(event.target.value)}>
                <option value="">Select guardian</option>
                {state.parents.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            {parent ? (
              <div className="status-card">
                <p>Phone <StatusPill status={parent.otpVerified ? "approved" : "pending"} label={parent.otpVerified ? "verified" : "needs OTP"} /></p>
                <p>Identity <StatusPill status={parent.identityStatus} /></p>
                <button type="button" onClick={verifyOtp}>Verify phone OTP</button>
              </div>
            ) : null}
          </section>
          <section>
            <form onSubmit={addChild} className="stack">
              <label>
                Child display name
                <input name="displayName" required disabled={!parent} placeholder="Visible only to guardian and school" />
              </label>
              <label>
                School
                <select name="schoolId" required disabled={!parent}>
                  {approvedSchools.map((school) => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={!parent}>Register child</button>
            </form>
          </section>
        </div>
      </section>

      <section className="panel">
        <h2>My children</h2>
        <div className="record-list">
          {myChildren.length === 0 ? <p className="empty">No children registered yet.</p> : null}
          {myChildren.map((child) => (
            <article key={child.id}>
              <div>
                <strong>{child.pseudonymousId}</strong>
                <p>{schoolName(state, child.schoolId)} / {child.displayName}</p>
              </div>
              <StatusPill status={child.verificationStatus} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatusPill({ status, label }: { status: Status; label?: string }) {
  return <span className={`pill ${status}`}>{label ?? status}</span>;
}

function schoolName(state: AppState, id?: string) {
  return state.schools.find((school) => school.id === id)?.name ?? "No school";
}
