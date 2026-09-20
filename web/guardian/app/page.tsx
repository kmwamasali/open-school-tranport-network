"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "pending" | "approved" | "rejected";
type AuthStage = "welcome" | "register" | "signin" | "verify" | "dashboard";
type TransportPlanStatus = "assigned" | "scheduled";
type TripStatus = "scheduled";

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

type DriverRecord = {
  id: string;
  name: string;
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

type TransportPlanRecord = {
  id: string;
  schoolId: string;
  parentId: string;
  childId: string;
  driverId: string;
  vehicleId: string;
  routeLabel: string;
  pickupPoint: string;
  dropoffPoint: string;
  status: TransportPlanStatus;
  createdAt: string;
};

type TripRecord = {
  id: string;
  transportPlanId: string;
  schoolId: string;
  parentId: string;
  childId: string;
  driverId: string;
  vehicleId: string;
  scheduledStart: string;
  status: TripStatus;
  createdAt: string;
};

type AppState = {
  parents: ParentRecord[];
  authentications: AuthenticationRecord[];
  users: UserRecord[];
  identities: IdentityRecord[];
  guardianProfiles: GuardianProfileRecord[];
  drivers: DriverRecord[];
  schools: SchoolRecord[];
  vehicles: VehicleRecord[];
  schoolIdRequests: SchoolIdRequestRecord[];
  transportPlans: TransportPlanRecord[];
  trips: TripRecord[];
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
  transportPlans: [],
  trips: [],
  audit: ["MVP workspace created"]
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
  const parents = state.parents ?? initialState.parents;
  const existingUsers = state.users ?? [];
  const existingIdentities = state.identities ?? [];
  const existingProfiles = state.guardianProfiles ?? [];
  const existingAuthentications = state.authentications ?? [];
  const migrated = parents.reduce(
    (records, parent) => {
      if (records.authentications.some((item) => item.phone === parent.phone)) return records;
      const userId = uid("user");
      records.users.push({ id: userId, primaryRole: "guardian", isActive: true, createdAt: parent.createdAt });
      records.authentications.push({ id: uid("auth"), userId, phone: parent.phone, otpVerified: parent.otpVerified, createdAt: parent.createdAt });
      records.identities.push({ id: uid("identity"), userId, legalName: parent.name, verificationStatus: parent.identityStatus, verifiedByOrganizationId: parent.verifiedByOrganizationId, documents: parent.documents, createdAt: parent.createdAt });
      records.guardianProfiles.push({ id: uid("guardian-profile"), userId, parentId: parent.id, createdAt: parent.createdAt });
      return records;
    },
    { authentications: [...existingAuthentications], users: [...existingUsers], identities: [...existingIdentities], guardianProfiles: [...existingProfiles] }
  );
  return {
    parents,
    authentications: migrated.authentications,
    users: migrated.users,
    identities: migrated.identities,
    guardianProfiles: migrated.guardianProfiles,
    drivers: state.drivers ?? initialState.drivers,
    schools: (state.schools ?? initialState.schools).map((school) =>
      school.status === "approved" && !school.verifiedByOrganizationId
        ? { ...school, verifiedByOrganizationId: VERIFICATION_ORG_ID }
        : school
    ),
    vehicles: state.vehicles ?? initialState.vehicles,
    schoolIdRequests: state.schoolIdRequests ?? [],
    transportPlans: state.transportPlans ?? [],
    trips: state.trips ?? [],
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
  const [authStage, setAuthStage] = useState<AuthStage>("welcome");
  const [sessionUserId, setSessionUserId] = useState("");
  const [studentAccessChildId, setStudentAccessChildId] = useState("");
  const [studentAccessMessage, setStudentAccessMessage] = useState("");

  useEffect(() => {
    const loadedState = loadState();
    setState(loadedState);
    const savedUserId = window.sessionStorage.getItem("ostn.guardian.session");
    if (savedUserId) {
      const savedAuth = loadedState.authentications.find((item) => item.userId === savedUserId);
      const savedProfile = loadedState.guardianProfiles.find((item) => item.userId === savedUserId);
      if (savedAuth) {
        setSessionUserId(savedUserId);
        if (savedProfile) setSelectedParentId(savedProfile.parentId);
        setAuthStage(savedAuth.otpVerified ? "dashboard" : "verify");
      }
    }
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const approvedSchools = state.schools.filter((school) => school.status === "approved");
  const parent = state.parents.find((item) => item.id === selectedParentId);
  const eligibleSchools = parent
    ? approvedSchools.filter(
        (school) =>
          parent.identityStatus === "approved" &&
          school.verifiedByOrganizationId === parent.verifiedByOrganizationId
      )
    : [];
  const myChildren = useMemo(() => parent?.children ?? [], [parent]);
  const myTransportPlans = useMemo(
    () => parent ? state.transportPlans.filter((plan) => plan.parentId === parent.id) : [],
    [parent, state.transportPlans]
  );
  const myTrips = useMemo(
    () => parent ? state.trips.filter((trip) => trip.parentId === parent.id) : [],
    [parent, state.trips]
  );

  function commit(updater: (current: AppState) => AppState, audit: string) {
    setState((current) => {
      const next = updater(current);
      return { ...next, audit: [`${new Date().toLocaleString()}: ${audit}`, ...next.audit] };
    });
    setMessage(audit);
  }

  async function registerParent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const upload = await readFile(form.get("document") as File);
    const userId = uid("user");
    const createdAt = new Date().toISOString();
    const record: ParentRecord = {
      id: uid("parent"),
      name: String(form.get("name")),
      phone: String(form.get("phone")),
      otpVerified: false,
      identityStatus: upload ? "pending" : "rejected",
      schoolId: undefined,
      children: [],
      documents: makeDocument("Parent identity", upload),
      createdAt
    };
    const authentication: AuthenticationRecord = {
      id: uid("auth"),
      userId,
      phone: record.phone,
      otpVerified: false,
      createdAt
    };
    const user: UserRecord = {
      id: userId,
      primaryRole: "guardian",
      isActive: true,
      createdAt
    };
    const identity: IdentityRecord = {
      id: uid("identity"),
      userId,
      legalName: record.name,
      verificationStatus: record.identityStatus,
      documents: record.documents,
      createdAt
    };
    const guardianProfile: GuardianProfileRecord = {
      id: uid("guardian-profile"),
      userId,
      parentId: record.id,
      createdAt
    };
    const existingParent = state.parents.find((item) => item.phone === record.phone);
    const existingAuthentication = state.authentications.find((item) => item.phone === record.phone);
    let selectedId = existingParent?.id ?? record.id;
    commit(
      (current) => {
        const existing = current.parents.find((item) => item.phone === record.phone);
        if (!existing) {
          return {
            ...current,
            parents: [...current.parents, record],
            authentications: [...current.authentications, authentication],
            users: [...current.users, user],
            identities: [...current.identities, identity],
            guardianProfiles: [...current.guardianProfiles, guardianProfile]
          };
        }
        selectedId = existing.id;
        const existingAuth = current.authentications.find((item) => item.phone === record.phone);
        return {
          ...current,
          parents: current.parents.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  name: record.name,
                  schoolId: record.schoolId,
                  identityStatus: record.identityStatus,
                  verifiedByOrganizationId: undefined,
                  documents: [...item.documents, ...record.documents]
                }
              : item
          ),
          authentications: existingAuth
            ? current.authentications
            : [...current.authentications, { ...authentication, userId: uid("user") }],
          users: current.users,
          identities: existingAuth
            ? current.identities.map((item) =>
                item.userId === existingAuth.userId
                  ? {
                      ...item,
                      legalName: record.name,
                      verificationStatus: record.identityStatus,
                      verifiedByOrganizationId: undefined,
                      documents: [...item.documents, ...record.documents]
                    }
                  : item
              )
            : current.identities,
          guardianProfiles: current.guardianProfiles
        };
      },
      `Guardian registration submitted for ${record.name}`
    );
    setSelectedParentId(selectedId);
    const activeUserId = existingAuthentication?.userId ?? userId;
    window.sessionStorage.setItem("ostn.guardian.session", activeUserId);
    setSessionUserId(activeUserId);
    setAuthStage("verify");
    formElement.reset();
  }

  function verifyOtp() {
    commit(
      (current) => ({
        ...current,
        parents: current.parents.map((item) =>
          item.id === selectedParentId ? { ...item, otpVerified: true } : item
        ),
        authentications: current.authentications.map((item) =>
          item.userId === sessionUserId ? { ...item, otpVerified: true } : item
        )
      }),
      "Phone verification completed"
    );
    const authentication = state.authentications.find((item) => item.userId === sessionUserId);
    if (authentication) {
      window.sessionStorage.setItem("ostn.guardian.session", authentication.userId);
    }
    setAuthStage("dashboard");
  }

  function signInParent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = String(new FormData(event.currentTarget).get("phone"));
    const authentication = state.authentications.find((item) => item.phone === phone);
    const matchedParent = state.parents.find((item) => item.phone === phone);
    if (!authentication || !matchedParent) {
      setMessage("No guardian account was found for that phone number.");
      return;
    }
    setSelectedParentId(matchedParent.id);
    setSessionUserId(authentication.userId);
    window.sessionStorage.setItem("ostn.guardian.session", authentication.userId);
    setMessage("Signed in. Verify your phone below to continue.");
    setAuthStage(authentication.otpVerified ? "dashboard" : "verify");
    event.currentTarget.reset();
  }

  function signOut() {
    window.sessionStorage.removeItem("ostn.guardian.session");
    setSessionUserId("");
    setSelectedParentId("");
    setAuthStage("welcome");
    setStudentAccessChildId("");
    setStudentAccessMessage("");
    setMessage("You have been signed out of this device.");
  }

  function signInStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const studentIdentifier = String(form.get("studentId")).trim().toUpperCase();
    const guardianPhone = String(form.get("guardianPhone")).trim();
    const matchedChild = parent?.children.find(
      (child) => child.pseudonymousId === studentIdentifier && (child.guardianPhone ?? parent.phone) === guardianPhone
    );
    if (!matchedChild) {
      setStudentAccessMessage("That student ID could not be verified for this guardian account.");
      return;
    }
    setStudentAccessChildId(matchedChild.id);
    setStudentAccessMessage("Limited student view unlocked.");
    event.currentTarget.reset();
  }

  function signOutStudent() {
    setStudentAccessChildId("");
    setStudentAccessMessage("Student view locked.");
  }

  const sessionAuth = state.authentications.find((item) => item.userId === sessionUserId);
  const sessionUser = state.users.find((item) => item.id === sessionUserId);
  const sessionIdentity = state.identities.find((item) => item.userId === sessionUserId);
  const sessionProfile = state.guardianProfiles.find((item) => item.userId === sessionUserId);
  const studentAccessChild = parent?.children.find((child) => child.id === studentAccessChildId);
  const studentAccessPlan = parent && studentAccessChild
    ? state.transportPlans.find((plan) => plan.parentId === parent.id && plan.childId === studentAccessChild.id)
    : undefined;
  const studentAccessTrip = studentAccessPlan
    ? state.trips.find((trip) => trip.transportPlanId === studentAccessPlan.id)
    : undefined;

  function claimChildren(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone"));
    const schoolId = String(form.get("schoolId"));
    commit(
      (current) => ({
        ...current,
        parents: current.parents.map((item) =>
          item.id === selectedParentId && item.phone === phone
            ? { ...item, schoolId }
            : item
        )
      }),
      "Guardian linked to school-created child records"
    );
    event.currentTarget.reset();
  }

  function sendSchoolIdRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const schoolId = String(form.get("schoolId"));
    const school = state.schools.find((item) => item.id === schoolId);
    if (
      !parent ||
      !school ||
      parent.identityStatus !== "approved" ||
      parent.verifiedByOrganizationId !== school.verifiedByOrganizationId
    ) {
      setMessage("Guardian and school must be approved by the same verification organization");
      return;
    }
    const alreadyRequested = state.schoolIdRequests.some(
      (request) => request.parentId === parent.id && request.schoolId === schoolId
    );
    if (alreadyRequested) {
      setMessage("Guardian ID request already exists for this school");
      return;
    }
    const request: SchoolIdRequestRecord = {
      id: uid("school-request"),
      parentId: parent.id,
      schoolId,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    commit(
      (current) => ({ ...current, schoolIdRequests: [...current.schoolIdRequests, request] }),
      `Guardian ID request sent to ${school.name}`
    );
    event.currentTarget.reset();
  }

  return (
    <main>
      <header className="topbar">
        <div className="portal-header">
          <img className="portal-logo" src="/MaMa-Johns-School-Tranport-Logo.png" alt="MaMa John's School Transport Network" />
          <p className="eyebrow">Guardian Portal</p>
          <h1>Guardian onboarding</h1>
        </div>
      </header>

      {message ? <p className="toast">{message}</p> : null}

      <AuthJourney
        stage={authStage}
        sessionAuth={sessionAuth}
        sessionUser={sessionUser}
        sessionIdentity={sessionIdentity}
        sessionProfile={sessionProfile}
        parent={parent}
        onStartRegister={() => setAuthStage("register")}
        onStartSignIn={() => setAuthStage("signin")}
        onRegister={registerParent}
        onSignIn={signInParent}
        onVerify={verifyOtp}
        onDashboard={() => setAuthStage("dashboard")}
        onSignOut={signOut}
      />

      {authStage === "dashboard" ? <>

      <section className="panel">
        <div className="panel-heading">
          <h2>Register and verify</h2>
          <p>Identity evidence is submitted for operations review before school ID requests are available.</p>
        </div>
        <form onSubmit={registerParent} className="form-grid">
          <label>
            Guardian name
            <input name="name" required placeholder="Amina Kato" />
          </label>
          <label>
            Phone
            <input name="phone" required placeholder="+256..." />
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
          <p>Select a local demo guardian to continue phone verification, school ID requests, and child link claims.</p>
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
            <form onSubmit={signInParent} className="inline-form">
              <label>
                Sign in with phone
                <input name="phone" required placeholder="+256..." />
              </label>
              <button type="submit" className="ghost">Sign in</button>
            </form>
            {parent ? (
              <div className="status-card">
                <p>Phone <StatusPill status={parent.otpVerified ? "approved" : "pending"} label={parent.otpVerified ? "verified" : "needs OTP"} /></p>
                <p>Identity <StatusPill status={parent.identityStatus} /></p>
                <button type="button" onClick={verifyOtp}>Verify phone OTP</button>
              </div>
            ) : null}
          </section>
          <section>
            <h3>School ID request</h3>
            <form onSubmit={sendSchoolIdRequest} className="stack">
              <label>
                Verified school
                <select name="schoolId" required disabled={!parent || parent.identityStatus !== "approved" || eligibleSchools.length === 0}>
                  {eligibleSchools.map((school) => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={!parent || parent.identityStatus !== "approved" || eligibleSchools.length === 0}>Send ID request</button>
            </form>
            {parent && parent.identityStatus !== "approved" ? <p className="helper">Operations must approve your identity before school ID requests are available.</p> : null}
            {parent && parent.identityStatus === "approved" && eligibleSchools.length === 0 ? <p className="helper">No approved schools share this guardian's verification organization yet.</p> : null}
          </section>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>School access</h2>
          <p>Requests are limited to schools verified by {VERIFICATION_ORG_NAME} for the selected guardian.</p>
        </div>
        <div className="two-column">
          <section>
            <h3>Child link claim</h3>
            <form onSubmit={claimChildren} className="stack">
              <label>
                Guardian phone
                <input name="phone" required disabled={!parent} defaultValue={parent?.phone ?? ""} placeholder="+256..." />
              </label>
              <label>
                Approved request school
                <select name="schoolId" required disabled={!parent}>
                  {state.schoolIdRequests
                    .filter((request) => request.parentId === selectedParentId && request.status === "approved")
                    .map((request) => state.schools.find((school) => school.id === request.schoolId))
                    .filter((school): school is SchoolRecord => Boolean(school))
                    .map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                </select>
              </label>
              <button type="submit" disabled={!parent}>Claim child link</button>
            </form>
          </section>
          <section>
            <h3>My ID requests</h3>
            <div className="record-list">
              {state.schoolIdRequests.filter((request) => request.parentId === selectedParentId).length === 0 ? <p className="empty">No school ID requests yet.</p> : null}
              {state.schoolIdRequests
                .filter((request) => request.parentId === selectedParentId)
                .map((request) => (
                  <article key={request.id}>
                    <div>
                      <strong>{schoolName(state, request.schoolId)}</strong>
                      <p>Verified through {VERIFICATION_ORG_NAME}</p>
                    </div>
                    <StatusPill status={request.status} />
                  </article>
                ))}
            </div>
          </section>
        </div>
      </section>

      <section className="panel">
        <h2>My children</h2>
        <div className="record-list">
          {myChildren.length === 0 ? <p className="empty">No school-created child records are linked to this guardian yet.</p> : null}
          {myChildren.map((child) => {
            const plan = myTransportPlans.find((item) => item.childId === child.id);
            const trip = plan ? myTrips.find((item) => item.transportPlanId === plan.id) : undefined;
            return (
              <article key={child.id}>
                <div>
                  <strong>{child.pseudonymousId}</strong>
                  <p>{schoolName(state, child.schoolId)} / {child.displayName}</p>
                  <p>{plan ? `${plan.routeLabel} with ${driverName(state, plan.driverId)}` : "No transport plan assigned"}</p>
                  {trip ? <p>Trip {trip.status} / {formatDateTime(trip.scheduledStart)}</p> : null}
                </div>
                <StatusPill status={child.verificationStatus} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Transport plans and trips</h2>
          <p>Only plans linked to this verified guardian relationship are shown here.</p>
        </div>
        <div className="record-list">
          {myTransportPlans.length === 0 ? <p className="empty">No transport plans have been assigned yet.</p> : null}
          {myTransportPlans.map((plan) => {
            const trip = myTrips.find((item) => item.transportPlanId === plan.id);
            const child = parent?.children.find((item) => item.id === plan.childId);
            return (
              <article key={plan.id}>
                <div>
                  <strong>{child?.pseudonymousId ?? "Student"} / {plan.routeLabel}</strong>
                  <p>{plan.pickupPoint} to {plan.dropoffPoint}</p>
                  <p>{driverName(state, plan.driverId)} / {vehicleName(state, plan.vehicleId)}</p>
                  {trip ? <p>{formatDateTime(trip.scheduledStart)} / {trip.status}</p> : <p>Trip not created yet</p>}
                </div>
                <span className="status-badge">{plan.status}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel student-access-panel">
        <div className="panel-heading">
          <p className="eyebrow">Limited student view</p>
          <h2>Student access from your guardian dashboard</h2>
          <p>A student can use their private ID to view only their own school and transport status. This is not part of the school administration dashboard.</p>
        </div>
        <form onSubmit={signInStudent} className="form-grid">
          <label>
            Student ID
            <input name="studentId" required placeholder="STU-7K4P9X" disabled={!parent} />
          </label>
          <label>
            Linked guardian phone
            <input name="guardianPhone" type="tel" required placeholder="+256..." disabled={!parent} />
          </label>
          <button type="submit" disabled={!parent}>Open limited view</button>
        </form>
        {studentAccessMessage ? <p className="helper" role="status">{studentAccessMessage}</p> : null}
        {studentAccessChild ? (
          <div className="student-limited-view">
            <div>
              <p className="eyebrow">Student session</p>
              <h3>{studentAccessChild.pseudonymousId}</h3>
              <p>{schoolName(state, studentAccessChild.schoolId)}</p>
            </div>
            <div className="student-limited-details">
              <span><strong>Relationship</strong>{studentAccessChild.verificationStatus}</span>
              <span><strong>Transport</strong>{studentAccessTrip ? `${studentAccessTrip.status} / ${formatDateTime(studentAccessTrip.scheduledStart)}` : "Trip details appear when assigned"}</span>
              <span><strong>Personal data</strong>Limited to this student record</span>
            </div>
            <button type="button" className="ghost" onClick={signOutStudent}>Lock student view</button>
          </div>
        ) : null}
      </section>
      </> : null}
    </main>
  );
}

function StatusPill({ status, label }: { status: Status; label?: string }) {
  return <span className={`pill ${status}`}>{label ?? status}</span>;
}

function AuthJourney({
  stage,
  sessionAuth,
  sessionUser,
  sessionIdentity,
  sessionProfile,
  parent,
  onStartRegister,
  onStartSignIn,
  onRegister,
  onSignIn,
  onVerify,
  onDashboard,
  onSignOut
}: {
  stage: AuthStage;
  sessionAuth?: AuthenticationRecord;
  sessionUser?: UserRecord;
  sessionIdentity?: IdentityRecord;
  sessionProfile?: GuardianProfileRecord;
  parent?: ParentRecord;
  onStartRegister: () => void;
  onStartSignIn: () => void;
  onRegister: (event: FormEvent<HTMLFormElement>) => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onVerify: () => void;
  onDashboard: () => void;
  onSignOut: () => void;
}) {
  if (stage === "dashboard" && sessionUser && sessionIdentity && sessionProfile && parent) {
    return (
      <section className="auth-dashboard panel">
        <div>
          <p className="eyebrow">Signed-in guardian workspace</p>
          <h2>Welcome back, {parent.name.split(" ")[0]}</h2>
          <p>Your account is separated into authentication, user, identity, and guardian profile records.</p>
        </div>
        <div className="auth-summary">
          <span><strong>Authentication</strong>{sessionAuth?.otpVerified ? "Phone verified" : "Phone pending"}</span>
          <span><strong>User</strong>{sessionUser.primaryRole}</span>
          <span><strong>IdentityRecord</strong>{sessionIdentity.verificationStatus}</span>
          <span><strong>Guardian profile</strong>{parent.children.length} linked child{parent.children.length === 1 ? "" : "ren"}</span>
        </div>
        <button type="button" className="ghost" onClick={onSignOut}>Sign out</button>
      </section>
    );
  }

  if (stage === "verify" && parent) {
    return (
      <section className="auth-step panel">
        <div>
          <p className="eyebrow">Step 2 of 2 · Phone verification</p>
          <h2>Confirm your guardian account</h2>
          <p>We have a local verification code ready for <strong>{parent.phone}</strong>. Confirm it to open your workspace.</p>
        </div>
        <div className="auth-step-actions">
          <button type="button" onClick={onVerify} disabled={parent.otpVerified}>Verify phone OTP</button>
          <button type="button" className="ghost" onClick={onDashboard}>Continue to account</button>
        </div>
      </section>
    );
  }

  if (stage === "register") {
    return (
      <section className="auth-step panel">
        <div className="panel-heading">
          <p className="eyebrow">Step 1 of 2 · Profile registration</p>
          <h2>Create your guardian profile</h2>
          <p>Authentication details, identity evidence, and your guardian profile are stored separately.</p>
        </div>
        <form onSubmit={onRegister} className="form-grid auth-form">
          <label>Guardian name<input name="name" required placeholder="Amina Kato" /></label>
          <label>Phone number<input name="phone" type="tel" required placeholder="+256..." /></label>
          <label>Identity document<input name="document" type="file" accept="image/*,.pdf" required /></label>
          <button type="submit">Create profile</button>
        </form>
        <p className="helper">School access becomes available after the Trust Desk approves your identity.</p>
        <button type="button" className="text-button" onClick={onStartSignIn}>Already registered? Sign in</button>
      </section>
    );
  }

  if (stage === "signin") {
    return (
      <section className="auth-step panel">
        <div className="panel-heading">
          <p className="eyebrow">Account access</p>
          <h2>Sign in to your guardian profile</h2>
          <p>Use the phone number attached to your authentication record.</p>
        </div>
        <form onSubmit={onSignIn} className="inline-form auth-form">
          <label>Phone number<input name="phone" type="tel" required placeholder="+256..." /></label>
          <button type="submit">Continue</button>
        </form>
        <button type="button" className="text-button" onClick={onStartRegister}>Create a new guardian profile</button>
      </section>
    );
  }

  return (
    <section className="auth-welcome panel">
      <div>
        <p className="eyebrow">Guardian access</p>
        <h2>Keep every school journey connected.</h2>
        <p>Register a guardian profile or sign in to manage school access, linked children, and verification status.</p>
      </div>
      <div className="auth-step-actions"><button type="button" onClick={onStartRegister}>Create guardian profile</button><button type="button" className="ghost" onClick={onStartSignIn}>Sign in</button></div>
    </section>
  );
}

function schoolName(state: AppState, id?: string) {
  return state.schools.find((school) => school.id === id)?.name ?? "No school";
}

function driverName(state: AppState, id: string) {
  return state.drivers.find((driver) => driver.id === id)?.name ?? "Assigned driver";
}

function vehicleName(state: AppState, id: string) {
  return state.vehicles.find((vehicle) => vehicle.id === id)?.registrationNumber ?? "Assigned vehicle";
}

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString() : "Unscheduled";
}
