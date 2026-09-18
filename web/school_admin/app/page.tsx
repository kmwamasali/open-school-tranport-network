"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "pending" | "approved" | "rejected";
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

type AuthenticationRecord = {
  id: string;
  userId: string;
  phone: string;
  otpVerified: boolean;
  createdAt: string;
};

type UserRecord = {
  id: string;
  primaryRole: "guardian";
  isActive: boolean;
  createdAt: string;
};

type IdentityRecord = {
  id: string;
  userId: string;
  legalName: string;
  verificationStatus: Status;
  documents: DocumentRecord[];
  createdAt: string;
};

type GuardianProfileRecord = {
  id: string;
  userId: string;
  parentId: string;
  createdAt: string;
};

type SchoolAuthenticationRecord = {
  id: string;
  userId: string;
  phone: string;
  otpVerified: boolean;
  createdAt: string;
};

type SchoolUserRecord = {
  id: string;
  primaryRole: "school_staff";
  isActive: boolean;
  createdAt: string;
};

type SchoolIdentityRecord = {
  id: string;
  userId: string;
  legalName: string;
  verificationStatus: Status;
  createdAt: string;
};

type SchoolStaffProfileRecord = {
  id: string;
  userId: string;
  schoolId: string;
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
  authentications: AuthenticationRecord[];
  users: UserRecord[];
  identities: IdentityRecord[];
  guardianProfiles: GuardianProfileRecord[];
  schoolAuthentications: SchoolAuthenticationRecord[];
  schoolUsers: SchoolUserRecord[];
  schoolIdentities: SchoolIdentityRecord[];
  schoolStaffProfiles: SchoolStaffProfileRecord[];
  drivers: unknown[];
  schools: SchoolRecord[];
  vehicles: unknown[];
  schoolIdRequests: SchoolIdRequestRecord[];
  audit: string[];
};

type UploadedFile = {
  fileName: string;
  dataUrl: string;
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

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const pseudoStudentId = () =>
  `STU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function loadState(): AppState {
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
  const [authStage, setAuthStage] = useState<AuthStage>("welcome");
  const [sessionUserId, setSessionUserId] = useState("");

  useEffect(() => {
    const loadedState = loadState();
    setState(loadedState);
    const savedUserId = window.sessionStorage.getItem("ostn.school.session");
    const savedProfile = loadedState.schoolStaffProfiles.find((item) => item.userId === savedUserId);
    if (savedUserId && savedProfile) {
      setSessionUserId(savedUserId);
      setSelectedSchoolId(savedProfile.schoolId);
      setAuthStage("dashboard");
    }
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const school = state.schools.find((item) => item.id === selectedSchoolId);
  const schoolIdRequests = state.schoolIdRequests.filter((request) => request.schoolId === selectedSchoolId);
  const students = useMemo(
    () =>
      state.parents.flatMap((parent) =>
        parent.children
          .filter((child) => child.schoolId === selectedSchoolId)
          .map((child) => ({ parent, child }))
      ),
    [selectedSchoolId, state.parents]
  );
  const sessionAuth = state.schoolAuthentications.find((item) => item.userId === sessionUserId);

  function commit(updater: (current: AppState) => AppState, audit: string) {
    setState((current) => {
      const next = updater(current);
      return { ...next, audit: [`${new Date().toLocaleString()}: ${audit}`, ...next.audit] };
    });
    setMessage(audit);
  }

  async function registerSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
    const userId = uid("school-user");
    const schoolAuth: SchoolAuthenticationRecord = { id: uid("school-auth"), userId, phone: record.phone, otpVerified: false, createdAt: record.createdAt };
    const schoolUser: SchoolUserRecord = { id: userId, primaryRole: "school_staff", isActive: true, createdAt: record.createdAt };
    const schoolIdentity: SchoolIdentityRecord = { id: uid("school-identity"), userId, legalName: record.contactName, verificationStatus: "pending", createdAt: record.createdAt };
    const schoolProfile: SchoolStaffProfileRecord = { id: uid("school-staff"), userId, schoolId: record.id, createdAt: record.createdAt };
    commit((current) => ({ ...current, schools: [...current.schools, record], schoolAuthentications: [...current.schoolAuthentications, schoolAuth], schoolUsers: [...current.schoolUsers, schoolUser], schoolIdentities: [...current.schoolIdentities, schoolIdentity], schoolStaffProfiles: [...current.schoolStaffProfiles, schoolProfile] }), `School registration submitted for ${record.name}`);
    setSelectedSchoolId(record.id);
    setSessionUserId(userId);
    window.sessionStorage.setItem("ostn.school.session", userId);
    setAuthStage("verify");
    formElement.reset();
  }

  function signInSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = String(new FormData(event.currentTarget).get("phone"));
    const authentication = state.schoolAuthentications.find((item) => item.phone === phone);
    const profile = authentication && state.schoolStaffProfiles.find((item) => item.userId === authentication.userId);
    if (!authentication || !profile) {
      setMessage("No school staff account was found for that phone number.");
      return;
    }
    setSessionUserId(authentication.userId);
    setSelectedSchoolId(profile.schoolId);
    window.sessionStorage.setItem("ostn.school.session", authentication.userId);
    setAuthStage(authentication.otpVerified ? "dashboard" : "verify");
    setMessage("School account found. Verify the phone to continue.");
  }

  function verifySchoolPhone() {
    if (!sessionUserId) return;
    commit((current) => ({ ...current, schoolAuthentications: current.schoolAuthentications.map((item) => item.userId === sessionUserId ? { ...item, otpVerified: true } : item) }), "School staff phone verified");
    setAuthStage("dashboard");
  }

  function signOutSchool() {
    window.sessionStorage.removeItem("ostn.school.session");
    setSessionUserId("");
    setAuthStage("welcome");
    setMessage("School account signed out.");
  }

  function createChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const guardianPhone = String(form.get("guardianPhone"));
    const schoolId = String(form.get("schoolId"));
    const child: ChildRecord = {
      id: uid("child"),
      displayName: String(form.get("displayName")),
      pseudonymousId: pseudoStudentId(),
      schoolId,
      guardianPhone,
      verificationStatus: "pending"
    };
    commit(
      (current) => {
        const existingGuardian = current.parents.find((parent) => parent.phone === guardianPhone);
        if (existingGuardian) {
          return {
            ...current,
            parents: current.parents.map((parent) =>
              parent.id === existingGuardian.id
                ? { ...parent, schoolId, children: [...parent.children, child] }
                : parent
            )
          };
        }
        const placeholder: ParentRecord = {
          id: uid("guardian"),
          name: `Guardian ${guardianPhone}`,
          phone: guardianPhone,
          otpVerified: false,
          identityStatus: "pending",
          schoolId,
          children: [child],
          documents: [],
          createdAt: new Date().toISOString()
        };
        const userId = uid("user");
        const createdAt = placeholder.createdAt;
        return {
          ...current,
          parents: [...current.parents, placeholder],
          authentications: [
            ...current.authentications,
            { id: uid("auth"), userId, phone: guardianPhone, otpVerified: false, createdAt }
          ],
          users: [
            ...current.users,
            { id: userId, primaryRole: "guardian", isActive: true, createdAt }
          ],
          identities: [
            ...current.identities,
            { id: uid("identity"), userId, legalName: placeholder.name, verificationStatus: "pending", documents: [], createdAt }
          ],
          guardianProfiles: [
            ...current.guardianProfiles,
            { id: uid("guardian-profile"), userId, parentId: placeholder.id, createdAt }
          ]
        };
      },
      `School created child account ${child.pseudonymousId}`
    );
    event.currentTarget.reset();
  }

  function approveSchoolIdRequest(requestId: string) {
    commit(
      (current) => {
        const request = current.schoolIdRequests.find((item) => item.id === requestId);
        if (!request) return current;
        return {
          ...current,
          schoolIdRequests: current.schoolIdRequests.map((item) =>
            item.id === requestId
              ? { ...item, status: "approved", reviewedAt: new Date().toISOString() }
              : item
          ),
          parents: current.parents.map((parent) =>
            parent.id === request.parentId ? { ...parent, schoolId: request.schoolId } : parent
          )
        };
      },
      "Guardian ID request approved by school"
    );
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
        <div className="portal-header">
          <img className="portal-logo" src="/MaMa-Johns-School-Tranport-Logo.png" alt="MaMa John's School Transport Network" />
          <p className="eyebrow">School Portal</p>
          <h1>Registration and student verification</h1>
        </div>
      </header>

      {message ? <p className="toast">{message}</p> : null}

      <SchoolAuthJourney
        stage={authStage}
        school={school}
        sessionAuth={sessionAuth}
        onStartRegister={() => setAuthStage("register")}
        onStartSignIn={() => setAuthStage("signin")}
        onRegister={registerSchool}
        onSignIn={signInSchool}
        onVerify={verifySchoolPhone}
        onDashboard={() => setAuthStage("dashboard")}
        onSignOut={signOutSchool}
      />

      {authStage === "dashboard" ? <>

      <section className="panel">
        <div className="panel-heading">
          <h2>Register school</h2>
          <p>School documents are submitted to operations for approval before student workflows are active.</p>
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
          <p>Only guardian requests and students attached to the selected school are visible here.</p>
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
        <section className="subpanel">
          <h3>Guardian ID requests</h3>
          <div className="review-list">
            {schoolIdRequests.length === 0 ? <p className="empty">No guardian ID requests for this school yet.</p> : null}
            {schoolIdRequests.map((request) => {
              const parent = state.parents.find((item) => item.id === request.parentId);
              return (
                <article key={request.id} className="review-item">
                  <div>
                    <strong>{parent?.name ?? "Guardian"}</strong>
                    <p>{parent?.phone ?? "No phone"} / verified through {VERIFICATION_ORG_NAME}</p>
                  </div>
                  <StatusPill status={request.status} />
                  <button type="button" onClick={() => approveSchoolIdRequest(request.id)} disabled={request.status === "approved"}>
                    Approve ID request
                  </button>
                </article>
              );
            })}
          </div>
        </section>
        <section className="subpanel">
          <h3>Create child account</h3>
          <form onSubmit={createChild} className="form-grid">
            <input type="hidden" name="schoolId" value={selectedSchoolId} />
            <label>
              Child display name
              <input name="displayName" required disabled={!school || school.status !== "approved"} placeholder="Visible only to school and guardian" />
            </label>
            <label>
              Guardian phone
              <input name="guardianPhone" required disabled={!school || school.status !== "approved"} placeholder="+256..." />
            </label>
            <button type="submit" disabled={!school || school.status !== "approved"}>Create child</button>
          </form>
          {school && school.status !== "approved" ? <p className="helper">Child creation unlocks after operations approves this school.</p> : null}
        </section>
        <div className="review-list">
          {students.length === 0 ? <p className="empty">No guardian-submitted students for this school yet.</p> : null}
          {students.map(({ parent, child }) => (
            <article key={child.id} className="review-item">
              <div>
                <strong>{child.pseudonymousId}</strong>
                <p>{child.displayName} / guardian phone: {child.guardianPhone ?? parent.phone}</p>
              </div>
              <StatusPill status={child.verificationStatus} />
              <button type="button" onClick={() => verifyStudent(parent.id, child.id)}>
                Verify student
              </button>
            </article>
          ))}
        </div>
      </section>
      </> : null}

    </main>
  );
}

function SchoolAuthJourney({
  stage,
  school,
  sessionAuth,
  onStartRegister,
  onStartSignIn,
  onRegister,
  onSignIn,
  onVerify,
  onDashboard,
  onSignOut
}: {
  stage: AuthStage;
  school?: SchoolRecord;
  sessionAuth?: SchoolAuthenticationRecord;
  onStartRegister: () => void;
  onStartSignIn: () => void;
  onRegister: (event: FormEvent<HTMLFormElement>) => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onVerify: () => void;
  onDashboard: () => void;
  onSignOut: () => void;
}) {
  if (stage === "dashboard") {
    return <section className="auth-dashboard panel"><div><p className="eyebrow">School staff workspace</p><h2>{school?.name ?? "School dashboard"}</h2><p>Manage school-scoped students and guardian relationships from this verified workspace.</p></div><div className="auth-summary"><span><strong>Authentication</strong>{sessionAuth?.otpVerified ? "Phone verified" : "Phone pending"}</span><span><strong>School profile</strong>{school?.status ?? "pending"}</span><span><strong>Scope</strong>School records only</span></div><button type="button" className="ghost" onClick={onSignOut}>Sign out</button></section>;
  }
  if (stage === "verify") {
    return <section className="auth-step panel"><div><p className="eyebrow">Step 2 of 2 · Phone verification</p><h2>Confirm school staff access</h2><p>Verify the phone attached to this school staff account before using the dashboard.</p></div><div className="auth-step-actions"><button type="button" onClick={onVerify} disabled={sessionAuth?.otpVerified}>Verify phone OTP</button><button type="button" className="ghost" onClick={onDashboard}>Continue to dashboard</button></div></section>;
  }
  if (stage === "register") {
    return <section className="auth-step panel"><div className="panel-heading"><p className="eyebrow">Step 1 of 2 · School registration</p><h2>Register your school workspace</h2><p>School authentication, staff identity, and the school profile remain separate records.</p></div><form onSubmit={onRegister} className="form-grid auth-form"><label>School name<input name="name" required placeholder="Kampala Community School" /></label><label>Contact person<input name="contactName" required placeholder="Registrar" /></label><label>Phone number<input name="phone" type="tel" required placeholder="+256..." /></label><label>Registration document<input name="document" type="file" accept="image/*,.pdf" required /></label><button type="submit">Create school workspace</button></form><button type="button" className="text-button" onClick={onStartSignIn}>Already registered? Sign in</button></section>;
  }
  if (stage === "signin") {
    return <section className="auth-step panel"><div className="panel-heading"><p className="eyebrow">School account access</p><h2>Sign in to the school dashboard</h2><p>Use the staff phone number attached to the school authentication record.</p></div><form onSubmit={onSignIn} className="inline-form auth-form"><label>Phone number<input name="phone" type="tel" required placeholder="+256..." /></label><button type="submit">Continue</button></form><button type="button" className="text-button" onClick={onStartRegister}>Register a school workspace</button></section>;
  }
  return <section className="auth-welcome panel"><div><p className="eyebrow">School access</p><h2>Run a trusted school transport workspace.</h2><p>Register school staff access or sign in to verify guardian relationships and student records.</p></div><div className="auth-step-actions"><button type="button" onClick={onStartRegister}>Register school</button><button type="button" className="ghost" onClick={onStartSignIn}>Sign in</button></div></section>;
}

function StatusPill({ status, label }: { status: Status; label?: string }) {
  return <span className={`pill ${status}`}>{label ?? status}</span>;
}
