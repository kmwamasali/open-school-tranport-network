"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Status = "pending" | "approved" | "rejected";
type Role = "parent" | "driver" | "school" | "admin";

type DocumentRecord = {
  id: string;
  kind: string;
  fileName: string;
  dataUrl: string;
  status: Status;
  submittedAt: string;
  reviewedAt?: string;
  note?: string;
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

type ChildRecord = {
  id: string;
  displayName: string;
  pseudonymousId: string;
  schoolId?: string;
  verificationStatus: Status;
};

type DriverRecord = {
  id: string;
  name: string;
  phone: string;
  status: Status;
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

type VehicleRecord = {
  id: string;
  driverId: string;
  registrationNumber: string;
  status: Status;
  documents: DocumentRecord[];
};

type AppState = {
  parents: ParentRecord[];
  drivers: DriverRecord[];
  schools: SchoolRecord[];
  vehicles: VehicleRecord[];
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

const loadState = (): AppState => {
  if (typeof window === "undefined") return initialState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return initialState;
  }
};

const readFile = (file?: File | null): Promise<UploadedFile | undefined> =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ fileName: file.name, dataUrl: String(reader.result) });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

function makeDocument(kind: string, upload?: UploadedFile): DocumentRecord[] {
  if (!upload) return [];
  return [
    {
      id: uid("doc"),
      kind,
      fileName: upload.fileName,
      dataUrl: upload.dataUrl,
      status: "pending",
      submittedAt: new Date().toISOString()
    }
  ];
}

export default function Home() {
  const [state, setState] = useState<AppState>(initialState);
  const [role, setRole] = useState<Role>("parent");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("school-demo");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const selectedParent = state.parents.find((parent) => parent.id === selectedParentId);
  const selectedDriver = state.drivers.find((driver) => driver.id === selectedDriverId);

  const pendingDocuments = useMemo(() => {
    const parentDocs = state.parents.flatMap((parent) =>
      parent.documents.map((document) => ({
        ownerType: "parent" as const,
        ownerId: parent.id,
        ownerName: parent.name,
        document
      }))
    );
    const driverDocs = state.drivers.flatMap((driver) =>
      driver.documents.map((document) => ({
        ownerType: "driver" as const,
        ownerId: driver.id,
        ownerName: driver.name,
        document
      }))
    );
    const schoolDocs = state.schools.flatMap((school) =>
      school.documents.map((document) => ({
        ownerType: "school" as const,
        ownerId: school.id,
        ownerName: school.name,
        document
      }))
    );
    const vehicleDocs = state.vehicles.flatMap((vehicle) =>
      vehicle.documents.map((document) => ({
        ownerType: "vehicle" as const,
        ownerId: vehicle.id,
        ownerName: vehicle.registrationNumber,
        document
      }))
    );
    return [...parentDocs, ...driverDocs, ...schoolDocs, ...vehicleDocs];
  }, [state]);

  function commit(updater: (draft: AppState) => AppState, audit: string) {
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
    const parent: ParentRecord = {
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
    commit(
      (draft) => ({ ...draft, parents: [...draft.parents, parent] }),
      `Parent registration submitted for ${parent.name}`
    );
    setSelectedParentId(parent.id);
    event.currentTarget.reset();
  }

  function verifyParentOtp(parentId: string) {
    commit(
      (draft) => ({
        ...draft,
        parents: draft.parents.map((parent) =>
          parent.id === parentId ? { ...parent, otpVerified: true } : parent
        )
      }),
      "Parent phone verification completed"
    );
  }

  function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parentId = String(form.get("parentId"));
    const child: ChildRecord = {
      id: uid("child"),
      displayName: String(form.get("displayName")),
      pseudonymousId: pseudoStudentId(),
      schoolId: String(form.get("schoolId")),
      verificationStatus: "pending"
    };
    commit(
      (draft) => ({
        ...draft,
        parents: draft.parents.map((parent) =>
          parent.id === parentId
            ? { ...parent, schoolId: child.schoolId, children: [...parent.children, child] }
            : parent
        )
      }),
      `Child registration submitted as ${child.pseudonymousId}`
    );
    event.currentTarget.reset();
  }

  async function registerDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const upload = await readFile(form.get("document") as File);
    const driver: DriverRecord = {
      id: uid("driver"),
      name: String(form.get("name")),
      phone: String(form.get("phone")),
      status: "pending",
      documents: makeDocument("Driver identity or licence", upload),
      createdAt: new Date().toISOString()
    };
    commit(
      (draft) => ({ ...draft, drivers: [...draft.drivers, driver] }),
      `Driver application submitted for ${driver.name}`
    );
    setSelectedDriverId(driver.id);
    event.currentTarget.reset();
  }

  async function addDriverDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const driverId = String(form.get("driverId"));
    const upload = await readFile(form.get("document") as File);
    const docs = makeDocument(String(form.get("kind")), upload);
    commit(
      (draft) => ({
        ...draft,
        drivers: draft.drivers.map((driver) =>
          driver.id === driverId
            ? { ...driver, status: "pending", documents: [...driver.documents, ...docs] }
            : driver
        )
      }),
      "Driver document submitted for review"
    );
    event.currentTarget.reset();
  }

  async function registerSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const upload = await readFile(form.get("document") as File);
    const school: SchoolRecord = {
      id: uid("school"),
      name: String(form.get("name")),
      contactName: String(form.get("contactName")),
      phone: String(form.get("phone")),
      status: "pending",
      documents: makeDocument("School registration", upload),
      createdAt: new Date().toISOString()
    };
    commit(
      (draft) => ({ ...draft, schools: [...draft.schools, school] }),
      `School registration submitted for ${school.name}`
    );
    setSelectedSchoolId(school.id);
    event.currentTarget.reset();
  }

  async function registerVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const upload = await readFile(form.get("document") as File);
    const vehicle: VehicleRecord = {
      id: uid("vehicle"),
      driverId: String(form.get("driverId")),
      registrationNumber: String(form.get("registrationNumber")),
      status: "pending",
      documents: makeDocument("Vehicle registration or inspection", upload)
    };
    commit(
      (draft) => ({ ...draft, vehicles: [...draft.vehicles, vehicle] }),
      `Vehicle verification submitted for ${vehicle.registrationNumber}`
    );
    event.currentTarget.reset();
  }

  function verifyStudent(parentId: string, childId: string) {
    commit(
      (draft) => ({
        ...draft,
        parents: draft.parents.map((parent) =>
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
      "School verified guardian and student relationship"
    );
  }

  function approveDocument(ownerType: string, ownerId: string, documentId: string) {
    commit(
      (draft) => approveDocumentInState(draft, ownerType, ownerId, documentId),
      `${ownerType} document approved`
    );
  }

  function approveDocumentInState(
    draft: AppState,
    ownerType: string,
    ownerId: string,
    documentId: string
  ): AppState {
    const markDocument = (docs: DocumentRecord[]) =>
      docs.map((document) =>
        document.id === documentId
          ? { ...document, status: "approved" as Status, reviewedAt: new Date().toISOString() }
          : document
      );
    if (ownerType === "parent") {
      return {
        ...draft,
        parents: draft.parents.map((parent) =>
          parent.id === ownerId
            ? {
                ...parent,
                identityStatus: "approved",
                documents: markDocument(parent.documents)
              }
            : parent
        )
      };
    }
    if (ownerType === "driver") {
      return {
        ...draft,
        drivers: draft.drivers.map((driver) =>
          driver.id === ownerId
            ? { ...driver, status: "approved", documents: markDocument(driver.documents) }
            : driver
        )
      };
    }
    if (ownerType === "school") {
      return {
        ...draft,
        schools: draft.schools.map((school) =>
          school.id === ownerId
            ? { ...school, status: "approved", documents: markDocument(school.documents) }
            : school
        )
      };
    }
    return {
      ...draft,
      vehicles: draft.vehicles.map((vehicle) =>
        vehicle.id === ownerId
          ? { ...vehicle, status: "approved", documents: markDocument(vehicle.documents) }
          : vehicle
      )
    };
  }

  function resetDemo() {
    setState(initialState);
    setSelectedParentId("");
    setSelectedDriverId("");
    setSelectedSchoolId("school-demo");
    setMessage("Demo data reset");
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 1 MVP</p>
          <h1>Open School Transport Network</h1>
        </div>
        <button className="ghost" type="button" onClick={resetDemo}>
          Reset demo
        </button>
      </header>

      <section className="summary">
        <Metric label="Parents" value={state.parents.length} />
        <Metric label="Drivers" value={state.drivers.length} />
        <Metric label="Schools" value={state.schools.length} />
        <Metric label="Pending docs" value={pendingDocuments.filter((item) => item.document.status === "pending").length} />
      </section>

      <nav className="tabs" aria-label="Role views">
        {(["parent", "driver", "school", "admin"] as Role[]).map((item) => (
          <button
            key={item}
            className={role === item ? "active" : ""}
            type="button"
            onClick={() => setRole(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>

      {message ? <p className="toast">{message}</p> : null}

      {role === "parent" && (
        <RolePanel title="Parent onboarding" description="Register, verify phone and identity, select a school, then add a child.">
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
              Select school
              <select name="schoolId" required>
                {state.schools
                  .filter((school) => school.status === "approved")
                  .map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Identity document
              <input name="document" type="file" accept="image/*,.pdf" required />
            </label>
            <button type="submit">Register parent</button>
          </form>

          <div className="two-column">
            <section>
              <h3>Verification</h3>
              <select value={selectedParentId} onChange={(event) => setSelectedParentId(event.target.value)}>
                <option value="">Select parent</option>
                {state.parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
              {selectedParent ? (
                <div className="status-card">
                  <p>Phone: <StatusPill status={selectedParent.otpVerified ? "approved" : "pending"} label={selectedParent.otpVerified ? "verified" : "needs OTP"} /></p>
                  <p>Identity: <StatusPill status={selectedParent.identityStatus} /></p>
                  <button type="button" onClick={() => verifyParentOtp(selectedParent.id)}>
                    Verify phone OTP
                  </button>
                </div>
              ) : null}
            </section>

            <section>
              <h3>Child registration</h3>
              <form onSubmit={addChild} className="stack">
                <input type="hidden" name="parentId" value={selectedParentId} />
                <label>
                  Child display name
                  <input name="displayName" required disabled={!selectedParentId} placeholder="Used only for guardian/school" />
                </label>
                <label>
                  School
                  <select name="schoolId" required disabled={!selectedParentId}>
                    {state.schools
                      .filter((school) => school.status === "approved")
                      .map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button type="submit" disabled={!selectedParentId}>Add child</button>
              </form>
            </section>
          </div>

          <RecordList
            items={state.parents.flatMap((parent) =>
              parent.children.map((child) => ({
                id: child.id,
                title: `${child.pseudonymousId} - ${child.displayName}`,
                meta: `${parent.name} / ${schoolName(state, child.schoolId)}`,
                status: child.verificationStatus
              }))
            )}
          />
        </RolePanel>
      )}

      {role === "driver" && (
        <RolePanel title="Driver onboarding" description="Apply, submit documents, register a vehicle, and check approval status.">
          <form onSubmit={registerDriver} className="form-grid">
            <label>
              Driver name
              <input name="name" required placeholder="Daniel Okello" />
            </label>
            <label>
              Phone
              <input name="phone" required placeholder="+256..." />
            </label>
            <label>
              Licence or identity document
              <input name="document" type="file" accept="image/*,.pdf" required />
            </label>
            <button type="submit">Apply as driver</button>
          </form>

          <div className="two-column">
            <section>
              <h3>Document submission</h3>
              <form onSubmit={addDriverDocument} className="stack">
                <label>
                  Driver
                  <select name="driverId" value={selectedDriverId} onChange={(event) => setSelectedDriverId(event.target.value)} required>
                    <option value="">Select driver</option>
                    {state.drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Document type
                  <select name="kind">
                    <option>Driving licence</option>
                    <option>National ID</option>
                    <option>Safeguarding certificate</option>
                    <option>Training certificate</option>
                  </select>
                </label>
                <label>
                  File
                  <input name="document" type="file" accept="image/*,.pdf" required />
                </label>
                <button type="submit">Submit document</button>
              </form>
            </section>

            <section>
              <h3>Vehicle submission</h3>
              <form onSubmit={registerVehicle} className="stack">
                <label>
                  Driver
                  <select name="driverId" required>
                    <option value="">Select driver</option>
                    {state.drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Registration number
                  <input name="registrationNumber" required placeholder="UAX 123B" />
                </label>
                <label>
                  Vehicle document
                  <input name="document" type="file" accept="image/*,.pdf" required />
                </label>
                <button type="submit">Submit vehicle</button>
              </form>
            </section>
          </div>

          <RecordList
            items={state.drivers.map((driver) => ({
              id: driver.id,
              title: driver.name,
              meta: `${driver.documents.length} document(s) submitted`,
              status: driver.status
            }))}
          />
          {selectedDriver ? (
            <p className="helper">Current approval status for {selectedDriver.name}: <StatusPill status={selectedDriver.status} /></p>
          ) : null}
        </RolePanel>
      )}

      {role === "school" && (
        <RolePanel title="School onboarding and student verification" description="Register a school and approve student relationships for that school.">
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
            <button type="submit">Register school</button>
          </form>

          <label className="wide-select">
            Working school
            <select value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)}>
              {state.schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.status})
                </option>
              ))}
            </select>
          </label>

          <div className="review-list">
            {state.parents.flatMap((parent) =>
              parent.children
                .filter((child) => child.schoolId === selectedSchoolId)
                .map((child) => (
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
                ))
            )}
          </div>
        </RolePanel>
      )}

      {role === "admin" && (
        <RolePanel title="Admin verification dashboard" description="View uploaded evidence and approve identity, driver, vehicle, and school verification cases.">
          <div className="review-list">
            {pendingDocuments.length === 0 ? <p className="empty">No documents submitted yet.</p> : null}
            {pendingDocuments.map((item) => (
              <article key={item.document.id} className="review-item">
                <div>
                  <strong>{item.ownerName}</strong>
                  <p>{item.ownerType} / {item.document.kind} / {item.document.fileName}</p>
                  <DocumentPreview document={item.document} />
                </div>
                <StatusPill status={item.document.status} />
                <button
                  type="button"
                  onClick={() => approveDocument(item.ownerType, item.ownerId, item.document.id)}
                  disabled={item.document.status === "approved"}
                >
                  Approve
                </button>
              </article>
            ))}
          </div>

          <h3>Audit trail</h3>
          <ol className="audit">
            {state.audit.slice(0, 12).map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ol>
        </RolePanel>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function RolePanel({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status, label }: { status: Status; label?: string }) {
  return <span className={`pill ${status}`}>{label ?? status}</span>;
}

function RecordList({
  items
}: {
  items: { id: string; title: string; meta: string; status: Status }[];
}) {
  if (items.length === 0) return <p className="empty">No records yet.</p>;
  return (
    <div className="record-list">
      {items.map((item) => (
        <article key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <p>{item.meta}</p>
          </div>
          <StatusPill status={item.status} />
        </article>
      ))}
    </div>
  );
}

function DocumentPreview({ document }: { document: DocumentRecord }) {
  const isImage = document.dataUrl.startsWith("data:image");
  return (
    <div className="document-preview">
      {isImage ? <img src={document.dataUrl} alt={document.fileName} /> : null}
      <a href={document.dataUrl} target="_blank" rel="noreferrer">
        Open document
      </a>
    </div>
  );
}

function schoolName(state: AppState, id?: string) {
  return state.schools.find((school) => school.id === id)?.name ?? "No school";
}
