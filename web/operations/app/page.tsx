"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "pending" | "approved" | "rejected";
type OwnerType = "guardian" | "driver" | "school" | "vehicle";
type AuthStage = "welcome" | "register" | "signin" | "verify" | "dashboard";

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
  schoolAuthentications: unknown[];
  schoolUsers: unknown[];
  schoolIdentities: unknown[];
  schoolStaffProfiles: unknown[];
  studentAuthentications: unknown[];
  studentUsers: unknown[];
  studentProfiles: unknown[];
  driverAuthentications: unknown[];
  driverUsers: unknown[];
  driverIdentities: unknown[];
  driverProfiles: unknown[];
  drivers: DriverRecord[];
  schools: SchoolRecord[];
  vehicles: VehicleRecord[];
  schoolIdRequests: SchoolIdRequestRecord[];
  audit: string[];
  operatorAccount?: { name: string; phone: string; otpVerified: boolean };
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
  schoolAuthentications: [],
  schoolUsers: [],
  schoolIdentities: [],
  schoolStaffProfiles: [],
  studentAuthentications: [],
  studentUsers: [],
  studentProfiles: [],
  driverAuthentications: [],
  driverUsers: [],
  driverIdentities: [],
  driverProfiles: [],
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
  ,operatorAccount: undefined
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

function persistState(state: AppState) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state, (key, value) => key === "dataUrl" ? "" : value)
    );
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function normalizeState(state: Partial<AppState>): AppState {
  return {
    parents: state.parents ?? initialState.parents,
    authentications: state.authentications ?? initialState.authentications,
    users: state.users ?? initialState.users,
    identities: state.identities ?? initialState.identities,
    guardianProfiles: state.guardianProfiles ?? initialState.guardianProfiles,
    schoolAuthentications: state.schoolAuthentications ?? initialState.schoolAuthentications,
    schoolUsers: state.schoolUsers ?? initialState.schoolUsers,
    schoolIdentities: state.schoolIdentities ?? initialState.schoolIdentities,
    schoolStaffProfiles: state.schoolStaffProfiles ?? initialState.schoolStaffProfiles,
    studentAuthentications: state.studentAuthentications ?? initialState.studentAuthentications,
    studentUsers: state.studentUsers ?? initialState.studentUsers,
    studentProfiles: state.studentProfiles ?? initialState.studentProfiles,
    driverAuthentications: state.driverAuthentications ?? initialState.driverAuthentications,
    driverUsers: state.driverUsers ?? initialState.driverUsers,
    driverIdentities: state.driverIdentities ?? initialState.driverIdentities,
    driverProfiles: state.driverProfiles ?? initialState.driverProfiles,
    drivers: state.drivers ?? initialState.drivers,
    schools: (state.schools ?? initialState.schools).map((school) =>
      school.status === "approved" && !school.verifiedByOrganizationId
        ? { ...school, verifiedByOrganizationId: VERIFICATION_ORG_ID }
        : school
    ),
    vehicles: state.vehicles ?? initialState.vehicles,
    schoolIdRequests: state.schoolIdRequests ?? [],
    audit: state.audit ?? initialState.audit
    ,operatorAccount: state.operatorAccount
  };
}

export default function OperationsConsole() {
  const [state, setState] = useState<AppState>(initialState);
  const [message, setMessage] = useState("");
  const [authStage, setAuthStage] = useState<AuthStage>("welcome");

  useEffect(() => {
    const loadedState = loadState();
    setState(loadedState);
    if (window.sessionStorage.getItem("ostn.operations.session") && loadedState.operatorAccount?.otpVerified) {
      setAuthStage("dashboard");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      persistState(state);
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
  const schoolReviewItems = reviewItems.filter((item) => item.ownerType === "school");

  function registerOperator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const account = { name: String(form.get("name")), phone: String(form.get("phone")), otpVerified: false };
    setState((current) => ({ ...current, operatorAccount: account }));
    window.sessionStorage.setItem("ostn.operations.session", "pending");
    setAuthStage("verify");
    setMessage("Operations account created. Verify the operator phone to continue.");
    event.currentTarget.reset();
  }

  function signInOperator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = String(new FormData(event.currentTarget).get("phone"));
    if (!state.operatorAccount || state.operatorAccount.phone !== phone) {
      setMessage("No operations account was found for that phone number.");
      return;
    }
    window.sessionStorage.setItem("ostn.operations.session", "pending");
    setAuthStage(state.operatorAccount.otpVerified ? "dashboard" : "verify");
    setMessage("Operations account found. Verify the phone to continue.");
  }

  function verifyOperator() {
    setState((current) => ({ ...current, operatorAccount: current.operatorAccount ? { ...current.operatorAccount, otpVerified: true } : current.operatorAccount }));
    window.sessionStorage.setItem("ostn.operations.session", "verified");
    setAuthStage("dashboard");
    setMessage("Operations phone verified.");
  }

  function signOutOperator() {
    window.sessionStorage.removeItem("ostn.operations.session");
    setAuthStage("welcome");
    setMessage("Operations account signed out.");
  }

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

      {message ? <p className="toast">{message}</p> : null}

      <OperationsAuthJourney
        stage={authStage}
        account={state.operatorAccount}
        onStartRegister={() => setAuthStage("register")}
        onStartSignIn={() => setAuthStage("signin")}
        onRegister={registerOperator}
        onSignIn={signInOperator}
        onVerify={verifyOperator}
        onSignOut={signOutOperator}
      />

      {authStage === "dashboard" ? <>

      <section className="summary">
        <Metric label="Guardians" value={state.parents.length} />
        <Metric label="Drivers" value={state.drivers.length} />
        <Metric label="Schools" value={state.schools.length} />
        <Metric label="Pending docs" value={pendingItems.length} />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>School approvals</h2>
          <p>Approve school registration evidence here. Approved schools become visible to identity-verified guardians when they request school access.</p>
        </div>
        <div className="review-list">
          {schoolReviewItems.length === 0 ? <p className="empty">No school registration evidence has been submitted.</p> : null}
          {schoolReviewItems.map((item) => (
            <article key={`school-${item.document.id}`} className="review-item">
              <div>
                <strong>{item.ownerName}</strong>
                <p>{item.document.kind} / {item.document.fileName}</p>
              </div>
              <StatusPill status={item.document.status} />
              <button type="button" onClick={() => approveDocument(item.ownerType, item.ownerId, item.document.id)} disabled={item.document.status === "approved"}>Approve school</button>
            </article>
          ))}
        </div>
      </section>

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
      </> : null}
    </main>
  );
}

function OperationsAuthJourney({ stage, account, onStartRegister, onStartSignIn, onRegister, onSignIn, onVerify, onSignOut }: { stage: AuthStage; account?: { name: string; phone: string; otpVerified: boolean }; onStartRegister: () => void; onStartSignIn: () => void; onRegister: (event: FormEvent<HTMLFormElement>) => void; onSignIn: (event: FormEvent<HTMLFormElement>) => void; onVerify: () => void; onSignOut: () => void }) {
  if (stage === "dashboard") return <section className="auth-dashboard panel"><div><p className="eyebrow">Operations workspace</p><h2>Verification console</h2><p>{account?.name ?? "Operator"}, you are signed in to the accountable review workspace.</p></div><div className="auth-summary"><span><strong>Authentication</strong>{account?.otpVerified ? "Phone verified" : "Phone pending"}</span><span><strong>Role</strong>Operations</span><span><strong>Access</strong>Review and audit</span></div><button type="button" className="ghost" onClick={onSignOut}>Sign out</button></section>;
  if (stage === "verify") return <section className="auth-step panel"><div><p className="eyebrow">Step 2 of 2 · Operator verification</p><h2>Confirm operations access</h2><p>Verify the phone attached to the operations account before reviewing identity evidence.</p></div><button type="button" onClick={onVerify} disabled={account?.otpVerified}>Verify phone OTP</button></section>;
  if (stage === "register") return <section className="auth-step panel"><div className="panel-heading"><p className="eyebrow">Step 1 of 2 · Operator registration</p><h2>Create an operations account</h2><p>Operations access is separate from reviewed identities and role profiles.</p></div><form onSubmit={onRegister} className="form-grid auth-form"><label>Operator name<input name="name" required placeholder="Trust Desk Officer" /></label><label>Phone number<input name="phone" type="tel" required placeholder="+256..." /></label><button type="submit">Create account</button></form><button type="button" className="text-button" onClick={onStartSignIn}>Already registered? Sign in</button></section>;
  if (stage === "signin") return <section className="auth-step panel"><div className="panel-heading"><p className="eyebrow">Operations account access</p><h2>Sign in to the verification console</h2><p>Use the phone number attached to your operations authentication record.</p></div><form onSubmit={onSignIn} className="inline-form auth-form"><label>Phone number<input name="phone" type="tel" required placeholder="+256..." /></label><button type="submit">Continue</button></form><button type="button" className="text-button" onClick={onStartRegister}>Register operations account</button></section>;
  return <section className="auth-welcome panel"><div><p className="eyebrow">Operations access</p><h2>Review identity evidence responsibly.</h2><p>Sign in to access verification actions and the audit trail.</p></div><div className="auth-step-actions"><button type="button" onClick={onStartRegister}>Create account</button><button type="button" className="ghost" onClick={onStartSignIn}>Sign in</button></div></section>;
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
