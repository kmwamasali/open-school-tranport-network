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

function makeDocument(upload?: UploadedFile): DocumentRecord[] {
  if (!upload) return [];
  return [{
    id: uid("doc"),
    kind: "School registration",
    fileName: upload.fileName,
    dataUrl: upload.dataUrl,
    status: "pending",
    submittedAt: new Date().toISOString()
  }];
}

export default function SchoolPortal() {
  const [state, setState] = useState<AppState>(initialState);
  const [selectedSchoolId, setSelectedSchoolId] = useState("school-demo");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const school = state.schools.find((item) => item.id === selectedSchoolId);
  const students = useMemo(
    () =>
      state.parents.flatMap((parent) =>
        parent.children
          .filter((child) => child.schoolId === selectedSchoolId)
          .map((child) => ({ parent, child }))
      ),
    [selectedSchoolId, state.parents]
  );

  function commit(updater: (current: AppState) => AppState, audit: string) {
    setState((current) => {
      const next = updater(current);
      return { ...next, audit: [`${new Date().toLocaleString()}: ${audit}`, ...next.audit] };
    });
    setMessage(audit);
  }

  async function registerSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const upload = await readFile(form.get("document") as File);
    const record: SchoolRecord = {
      id: uid("school"),
      name: String(form.get("name")),
      contactName: String(form.get("contactName")),
      phone: String(form.get("phone")),
      status: "pending",
      documents: makeDocument(upload),
      createdAt: new Date().toISOString()
    };
    commit((current) => ({ ...current, schools: [...current.schools, record] }), `School registration submitted for ${record.name}`);
    setSelectedSchoolId(record.id);
    event.currentTarget.reset();
  }

  function verifyStudent(parentId: string, childId: string) {
    commit(
      (current) => ({
        ...current,
        parents: current.parents.map((parent) =>
          parent.id === parentId
            ? {
                ...parent,
                children: parent.children.map((child) =>
                  child.id === childId ? { ...child, verificationStatus: "approved" } : child
                )
              }
            : parent
        )
      }),
      "Student relationship verified by school"
    );
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">School Portal</p>
          <h1>Registration and student verification</h1>
        </div>
        <a className="nav-link" href="http://localhost:3001">Parent portal</a>
      </header>

      {message ? <p className="toast">{message}</p> : null}

      <section className="panel">
        <div className="panel-heading">
          <h2>Register school</h2>
          <p>School documents are submitted to operations for approval before transport workflows are active.</p>
        </div>
        <form onSubmit={registerSchool} className="form-grid">
          <label>
            School name
            <input name="name" required placeholder="Kampala Community School" />
          </label>
          <label>
            Contact person
            <input name="contactName" required placeholder="Registrar" />
          </label>
          <label>
            Phone
            <input name="phone" required placeholder="+256..." />
          </label>
          <label>
            Registration document
            <input name="document" type="file" accept="image/*,.pdf" required />
          </label>
          <button type="submit">Submit school</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Student verification</h2>
          <p>Only students attached to the selected school are visible here.</p>
        </div>
        <label className="wide-select">
          Working school
          <select value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)}>
            {state.schools.map((item) => (
              <option key={item.id} value={item.id}>{item.name} ({item.status})</option>
            ))}
          </select>
        </label>
        {school ? <p className="helper">School verification status: <StatusPill status={school.status} /></p> : null}
        <div className="review-list">
          {students.length === 0 ? <p className="empty">No guardian-submitted students for this school yet.</p> : null}
          {students.map(({ parent, child }) => (
            <article key={child.id} className="review-item">
              <div>
                <strong>{child.pseudonymousId}</strong>
                <p>{child.displayName} / guardian: {parent.name}</p>
              </div>
              <StatusPill status={child.verificationStatus} />
              <button type="button" onClick={() => verifyStudent(parent.id, child.id)}>
                Verify student
              </button>
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
