"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "pending" | "approved" | "rejected";
type OwnerType = "guardian" | "driver" | "school" | "vehicle";

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
  guardianPhone?: string;
  verificationStatus: Status;
};

type ParentRecord = {
  id: string;
  name: string;
  phone: string;
  otpVerified: boolean;
  identityStatus: Status;
  verifiedByOrganizationId?: string;
  schoolId?: string;
  children: ChildRecord[];
  documents: DocumentRecord[];
  createdAt: string;
};

type IdentityRecord = {
  id: string;
  userId: string;
  legalName: string;
  verificationStatus: Status;
  verifiedByOrganizationId?: string;
  documents: DocumentRecord[];
  createdAt: string;
};

type GuardianProfileRecord = {
  id: string;
  userId: string;
  parentId: string;
  createdAt: string;
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
  verifiedByOrganizationId?: string;
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

type SchoolIdRequestRecord = {
  id: string;
  parentId: string;
  schoolId: string;
  status: Status;
  createdAt: string;
  reviewedAt?: string;
};

type AppState = {
  parents: ParentRecord[];
  authentications: unknown[];
  users: unknown[];
  identities: IdentityRecord[];
  guardianProfiles: GuardianProfileRecord[];
  drivers: DriverRecord[];
  schools: SchoolRecord[];
  vehicles: VehicleRecord[];
  schoolIdRequests: SchoolIdRequestRecord[];
  audit: string[];
};

type ReviewItem = {
  ownerType: OwnerType;
  ownerId: string;
  ownerName: string;
  document: DocumentRecord;
};

const STORAGE_KEY = "ostn.phase1.mvp";
const VERIFICATION_ORG_ID = "org-ostn-trust";
const VERIFICATION_ORG_NAME = "OSTN Trust Desk";

const initialState: AppState = {
  parents: [],
  authentications: [],
  users: [],
  identities: [],
  guardianProfiles: [],
  drivers: [],
  schools: [
    {
      id: "school-demo",
      name: "MaMa John Primary School",
      contactName: "School Registrar",
      phone: "+256700000001",
      status: "approved",
      verifiedByOrganizationId: VERIFICATION_ORG_ID,
      documents: [],
      createdAt: new Date().toISOString()
    }
  ],
  vehicles: [],
  schoolIdRequests: [],
  audit: ["MVP workspace created"]
};

function loadState(): AppState {
  if (typeof window === "undefined") return initialState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return normalizeState(parsed);
  } catch {
    return initialState;
  }
}

function normalizeState(state: Partial<AppState>): AppState {
  return {
    parents: state.parents ?? initialState.parents,
    authentications: state.authentications ?? initialState.authentications,
    users: state.users ?? initialState.users,
    identities: state.identities ?? initialState.identities,
    guardianProfiles: state.guardianProfiles ?? initialState.guardianProfiles,
    drivers: state.drivers ?? initialState.drivers,
    schools: (state.schools ?? initialState.schools).map((school) =>
      school.status === "approved" && !school.verifiedByOrganizationId
        ? { ...school, verifiedByOrganizationId: VERIFICATION_ORG_ID }
        : school
    ),
    vehicles: state.vehicles ?? initialState.vehicles,
    schoolIdRequests: state.schoolIdRequests ?? [],
    audit: state.audit ?? initialState.audit
  };
}

export default function OperationsConsole() {
  const [state, setState] = useState<AppState>(initialState);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const reviewItems = useMemo(() => {
    const guardianDocs = state.parents.flatMap((parent) =>
      parent.documents.map((document) => ({
        ownerType: "guardian" as const,
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
    return [...guardianDocs, ...driverDocs, ...schoolDocs, ...vehicleDocs];
  }, [state]);

  const pendingItems = reviewItems.filter((item) => item.document.status === "pending");

  function commit(updater: (draft: AppState) => AppState, audit: string) {
    setState((current) => {
      const next = updater(current);
      return { ...next, audit: [`${new Date().toLocaleString()}: ${audit}`, ...next.audit] };
    });
    setMessage(audit);
  }

  function approveDocument(ownerType: OwnerType, ownerId: string, documentId: string) {
    commit(
      (draft) => approveDocumentInState(draft, ownerType, ownerId, documentId),
      `${ownerType} profile verified by ${VERIFICATION_ORG_NAME}`
    );
  }

  function approveDocumentInState(
    draft: AppState,
    ownerType: OwnerType,
    ownerId: string,
    documentId: string
  ): AppState {
    const markDocument = (docs: DocumentRecord[]) =>
      docs.map((document) =>
        document.id === documentId
          ? { ...document, status: "approved" as Status, reviewedAt: new Date().toISOString() }
          : document
      );

    if (ownerType === "guardian") {
      return {
        ...draft,
        parents: draft.parents.map((parent) =>
          parent.id === ownerId
            ? {
                ...parent,
                identityStatus: "approved",
                verifiedByOrganizationId: VERIFICATION_ORG_ID,
                documents: markDocument(parent.documents)
              }
            : parent
          ),
        identities: draft.identities.map((identity) => {
          const profile = draft.guardianProfiles.find((item) => item.userId === identity.userId);
          return profile?.parentId === ownerId
            ? { ...identity, verificationStatus: "approved", verifiedByOrganizationId: VERIFICATION_ORG_ID, documents: markDocument(identity.documents) }
            : identity;
        })
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
            ? {
                ...school,
                status: "approved",
                verifiedByOrganizationId: VERIFICATION_ORG_ID,
                documents: markDocument(school.documents)
              }
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

  return (
    <main>
      <header className="topbar">
        <div className="portal-header">
          <img className="portal-logo" src="/MaMa-Johns-School-Tranport-Logo.png" alt="MaMa John's School Transport Network" />
          <p className="eyebrow">Operations</p>
          <h1>Admin verification console</h1>
        </div>
        <span className="pill approved">{VERIFICATION_ORG_NAME}</span>
      </header>

      <section className="summary">
        <Metric label="Guardians" value={state.parents.length} />
        <Metric label="Drivers" value={state.drivers.length} />
        <Metric label="Schools" value={state.schools.length} />
        <Metric label="Pending docs" value={pendingItems.length} />
      </section>

      {message ? <p className="toast">{message}</p> : null}

      <section className="panel">
        <div className="panel-heading">
          <h2>Profile verification</h2>
          <p>Admin and NGO operators review submitted evidence only. Driver onboarding lives in the standalone driver portal.</p>
        </div>

        <div className="review-list">
          {reviewItems.length === 0 ? <p className="empty">No profile evidence has been submitted yet.</p> : null}
          {reviewItems.map((item) => (
            <article key={item.document.id} className="review-item">
              <div>
                <strong>{item.ownerName}</strong>
                <p>{item.ownerType} / {item.document.kind} / {item.document.fileName}</p>
                {item.document.status === "approved" ? <p>Verified through {VERIFICATION_ORG_NAME}</p> : null}
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
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Audit trail</h2>
          <p>Verification actions are recorded with the accountable organization context.</p>
        </div>
        <ol className="audit">
          {state.audit.slice(0, 14).map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
        </ol>
      </section>
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

function StatusPill({ status, label }: { status: Status; label?: string }) {
  return <span className={`pill ${status}`}>{label ?? status}</span>;
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
