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

type DriverRecord = {
  id: string;
  name: string;
  phone: string;
  status: Status;
  documents: DocumentRecord[];
  createdAt: string;
};

type DriverAuthenticationRecord = {
  id: string;
  userId: string;
  phone: string;
  otpVerified: boolean;
  createdAt: string;
};

type DriverUserRecord = {
  id: string;
  primaryRole: "driver";
  isActive: boolean;
  createdAt: string;
};

type DriverIdentityRecord = {
  id: string;
  userId: string;
  legalName: string;
  verificationStatus: Status;
  documents: DocumentRecord[];
  createdAt: string;
};

type DriverProfileRecord = {
  id: string;
  userId: string;
  driverId: string;
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
  driverAuthentications: DriverAuthenticationRecord[];
  driverUsers: DriverUserRecord[];
  driverIdentities: DriverIdentityRecord[];
  driverProfiles: DriverProfileRecord[];
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

const initialState: AppState = {
  parents: [],
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
  return {
    parents: state.parents ?? initialState.parents,
    driverAuthentications: state.driverAuthentications ?? initialState.driverAuthentications,
    driverUsers: state.driverUsers ?? initialState.driverUsers,
    driverIdentities: state.driverIdentities ?? initialState.driverIdentities,
    driverProfiles: state.driverProfiles ?? initialState.driverProfiles,
    drivers: state.drivers ?? initialState.drivers,
    schools: state.schools ?? initialState.schools,
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

export default function DriverPortal() {
  const [state, setState] = useState<AppState>(initialState);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [message, setMessage] = useState("");
  const [authStage, setAuthStage] = useState<AuthStage>("welcome");
  const [sessionUserId, setSessionUserId] = useState("");

  useEffect(() => {
    const loadedState = loadState();
    setState(loadedState);
    const savedUserId = window.sessionStorage.getItem("ostn.driver.session");
    const savedProfile = loadedState.driverProfiles.find((item) => item.userId === savedUserId);
    if (savedUserId && savedProfile) {
      setSessionUserId(savedUserId);
      setSelectedDriverId(savedProfile.driverId);
      setAuthStage("dashboard");
    }
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const selectedDriver = state.drivers.find((driver) => driver.id === selectedDriverId);
  const driverVehicles = useMemo(
    () => state.vehicles.filter((vehicle) => vehicle.driverId === selectedDriverId),
    [selectedDriverId, state.vehicles]
  );
  const assignedTrips = useMemo(
    () => state.trips.filter((trip) => trip.driverId === selectedDriverId),
    [selectedDriverId, state.trips]
  );
  const sessionAuth = state.driverAuthentications.find((item) => item.userId === sessionUserId);

  function commit(updater: (current: AppState) => AppState, audit: string) {
    setState((current) => {
      const next = updater(current);
      return { ...next, audit: [`${new Date().toLocaleString()}: ${audit}`, ...next.audit] };
    });
    setMessage(audit);
  }

  async function registerDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const upload = await readFile(form.get("document") as File);
    const driver: DriverRecord = {
      id: uid("driver"),
      name: String(form.get("name")),
      phone: String(form.get("phone")),
      status: "pending",
      documents: makeDocument("Driver identity or licence", upload),
      createdAt: new Date().toISOString()
    };
    const userId = uid("driver-user");
    const driverAuth: DriverAuthenticationRecord = { id: uid("driver-auth"), userId, phone: driver.phone, otpVerified: false, createdAt: driver.createdAt };
    const driverUser: DriverUserRecord = { id: userId, primaryRole: "driver", isActive: true, createdAt: driver.createdAt };
    const driverIdentity: DriverIdentityRecord = { id: uid("driver-identity"), userId, legalName: driver.name, verificationStatus: driver.status, documents: driver.documents, createdAt: driver.createdAt };
    const driverProfile: DriverProfileRecord = { id: uid("driver-profile"), userId, driverId: driver.id, createdAt: driver.createdAt };
    commit(
      (current) => ({ ...current, drivers: [...current.drivers, driver], driverAuthentications: [...current.driverAuthentications, driverAuth], driverUsers: [...current.driverUsers, driverUser], driverIdentities: [...current.driverIdentities, driverIdentity], driverProfiles: [...current.driverProfiles, driverProfile] }),
      `Driver application submitted for ${driver.name}`
    );
    setSelectedDriverId(driver.id);
    setSessionUserId(userId);
    window.sessionStorage.setItem("ostn.driver.session", userId);
    setAuthStage("verify");
    formElement.reset();
  }

  function signInDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = String(new FormData(event.currentTarget).get("phone"));
    const authentication = state.driverAuthentications.find((item) => item.phone === phone);
    const profile = authentication && state.driverProfiles.find((item) => item.userId === authentication.userId);
    if (!authentication || !profile) {
      setMessage("No driver account was found for that phone number.");
      return;
    }
    setSessionUserId(authentication.userId);
    setSelectedDriverId(profile.driverId);
    window.sessionStorage.setItem("ostn.driver.session", authentication.userId);
    setAuthStage(authentication.otpVerified ? "dashboard" : "verify");
    setMessage("Driver account found. Verify the phone to continue.");
  }

  function verifyDriverPhone() {
    if (!sessionUserId) return;
    commit((current) => ({ ...current, driverAuthentications: current.driverAuthentications.map((item) => item.userId === sessionUserId ? { ...item, otpVerified: true } : item) }), "Driver phone verified");
    setAuthStage("dashboard");
  }

  function signOutDriver() {
    window.sessionStorage.removeItem("ostn.driver.session");
    setSessionUserId("");
    setSelectedDriverId("");
    setAuthStage("welcome");
    setMessage("Driver account signed out.");
  }

  async function addDriverDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const driverId = String(form.get("driverId"));
    const upload = await readFile(form.get("document") as File);
    const docs = makeDocument(String(form.get("kind")), upload);
    commit(
      (current) => ({
        ...current,
        drivers: current.drivers.map((driver) =>
          driver.id === driverId
            ? { ...driver, status: "pending", documents: [...driver.documents, ...docs] }
            : driver
        )
      }),
      "Driver document submitted for operations review"
    );
    event.currentTarget.reset();
  }

  async function registerVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDriver || selectedDriver.status !== "approved") {
      setMessage("Driver identity must be approved before submitting a vehicle");
      return;
    }
    const form = new FormData(event.currentTarget);
    const upload = await readFile(form.get("document") as File);
    const vehicle: VehicleRecord = {
      id: uid("vehicle"),
      driverId: selectedDriver.id,
      registrationNumber: String(form.get("registrationNumber")),
      status: "pending",
      documents: makeDocument("Vehicle registration or inspection", upload)
    };
    commit(
      (current) => ({ ...current, vehicles: [...current.vehicles, vehicle] }),
      `Vehicle verification submitted for ${vehicle.registrationNumber}`
    );
    event.currentTarget.reset();
  }

  return (
    <main>
      <header className="topbar">
        <div className="portal-header">
          <img className="portal-logo" src="/MaMa-Johns-School-Tranport-Logo.png" alt="MaMa John's School Transport Network" />
          <p className="eyebrow">Driver Portal</p>
          <h1>Driver and fleet onboarding</h1>
        </div>
      </header>

      {message ? <p className="toast">{message}</p> : null}

      <DriverAuthJourney
        stage={authStage}
        driver={selectedDriver}
        sessionAuth={sessionAuth}
        onStartRegister={() => setAuthStage("register")}
        onStartSignIn={() => setAuthStage("signin")}
        onRegister={registerDriver}
        onSignIn={signInDriver}
        onVerify={verifyDriverPhone}
        onDashboard={() => setAuthStage("dashboard")}
        onSignOut={signOutDriver}
      />

      {authStage === "dashboard" ? <>

      <section className="panel">
        <div className="panel-heading">
          <h2>Apply as driver</h2>
          <p>Driver identity evidence is submitted to operations for review before vehicle registration unlocks.</p>
        </div>
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
          <button type="submit">Submit application</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>My driver profile</h2>
          <p>Use this portal to track approval, submit more evidence, and register vehicles after approval.</p>
        </div>
        <label className="wide-select">
          Driver profile
          <select value={selectedDriverId} onChange={(event) => setSelectedDriverId(event.target.value)}>
            <option value="">Select driver</option>
            {state.drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.name} ({driver.status})</option>
            ))}
          </select>
        </label>
        {selectedDriver ? (
          <div className="status-card">
            <p>Identity <StatusPill status={selectedDriver.status} /></p>
            <p className="helper">{selectedDriver.documents.length} document(s) submitted for review.</p>
          </div>
        ) : null}

        <div className="two-column">
          <section>
            <h3>Document submission</h3>
            <form onSubmit={addDriverDocument} className="stack">
              <input type="hidden" name="driverId" value={selectedDriverId} />
              <label>
                Document type
                <select name="kind" disabled={!selectedDriver}>
                  <option>Driving licence</option>
                  <option>National ID</option>
                  <option>Safeguarding certificate</option>
                  <option>Training certificate</option>
                </select>
              </label>
              <label>
                File
                <input name="document" type="file" accept="image/*,.pdf" required disabled={!selectedDriver} />
              </label>
              <button type="submit" disabled={!selectedDriver}>Submit document</button>
            </form>
          </section>

          <section>
            <h3>Vehicle submission</h3>
            <form onSubmit={registerVehicle} className="stack">
              <label>
                Registration number
                <input name="registrationNumber" required disabled={selectedDriver?.status !== "approved"} placeholder="UAX 123B" />
              </label>
              <label>
                Vehicle document
                <input name="document" type="file" accept="image/*,.pdf" required disabled={selectedDriver?.status !== "approved"} />
              </label>
              <button type="submit" disabled={selectedDriver?.status !== "approved"}>Submit vehicle</button>
            </form>
            {selectedDriver?.status !== "approved" ? <p className="helper">Vehicle registration unlocks after operations approves the driver identity.</p> : null}
          </section>
        </div>
      </section>

      <section className="panel">
        <h2>My vehicles</h2>
        <div className="record-list">
          {driverVehicles.length === 0 ? <p className="empty">No vehicles submitted for this driver yet.</p> : null}
          {driverVehicles.map((vehicle) => (
            <article key={vehicle.id}>
              <div>
                <strong>{vehicle.registrationNumber}</strong>
                <p>{vehicle.documents.length} document(s) submitted</p>
              </div>
              <StatusPill status={vehicle.status} />
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Assigned trips</h2>
          <p>Trips appear after a school creates a trip from a verified child, driver, and vehicle assignment.</p>
        </div>
        <div className="record-list">
          {assignedTrips.length === 0 ? <p className="empty">No trips assigned to this driver yet.</p> : null}
          {assignedTrips.map((trip) => {
            const plan = state.transportPlans.find((item) => item.id === trip.transportPlanId);
            const child = childById(state, trip.parentId, trip.childId);
            return (
              <article key={trip.id}>
                <div>
                  <strong>{child?.pseudonymousId ?? "Student"} / {plan?.routeLabel ?? "Route"}</strong>
                  <p>{plan ? `${plan.pickupPoint} to ${plan.dropoffPoint}` : schoolName(state, trip.schoolId)}</p>
                  <p>{formatDateTime(trip.scheduledStart)} / {vehicleName(state, trip.vehicleId)}</p>
                </div>
                <span className="status-badge">{trip.status}</span>
              </article>
            );
          })}
        </div>
      </section>
      </> : null}
    </main>
  );
}

function DriverAuthJourney({
  stage,
  driver,
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
  driver?: DriverRecord;
  sessionAuth?: DriverAuthenticationRecord;
  onStartRegister: () => void;
  onStartSignIn: () => void;
  onRegister: (event: FormEvent<HTMLFormElement>) => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onVerify: () => void;
  onDashboard: () => void;
  onSignOut: () => void;
}) {
  if (stage === "dashboard") {
    return <section className="auth-dashboard panel"><div><p className="eyebrow">Driver workspace</p><h2>{driver?.name ?? "Driver dashboard"}</h2><p>Manage verification evidence and vehicle access from your driver profile.</p></div><div className="auth-summary"><span><strong>Authentication</strong>{sessionAuth?.otpVerified ? "Phone verified" : "Phone pending"}</span><span><strong>Driver identity</strong>{driver?.status ?? "pending"}</span><span><strong>Vehicle access</strong>{driver?.status === "approved" ? "Available" : "Locked"}</span></div><button type="button" className="ghost" onClick={onSignOut}>Sign out</button></section>;
  }
  if (stage === "verify") {
    return <section className="auth-step panel"><div><p className="eyebrow">Step 2 of 2 · Phone verification</p><h2>Confirm your driver account</h2><p>Verify the phone attached to your driver authentication record before continuing.</p></div><div className="auth-step-actions"><button type="button" onClick={onVerify} disabled={sessionAuth?.otpVerified}>Verify phone OTP</button><button type="button" className="ghost" onClick={onDashboard}>Continue to dashboard</button></div></section>;
  }
  if (stage === "register") {
    return <section className="auth-step panel"><div className="panel-heading"><p className="eyebrow">Step 1 of 2 · Driver registration</p><h2>Create your driver profile</h2><p>Authentication, driver identity evidence, and the driver role profile remain separate records.</p></div><form onSubmit={onRegister} className="form-grid auth-form"><label>Driver name<input name="name" required placeholder="Daniel Okello" /></label><label>Phone number<input name="phone" type="tel" required placeholder="+256..." /></label><label>Licence or identity document<input name="document" type="file" accept="image/*,.pdf" required /></label><button type="submit">Create driver profile</button></form><button type="button" className="text-button" onClick={onStartSignIn}>Already registered? Sign in</button></section>;
  }
  if (stage === "signin") {
    return <section className="auth-step panel"><div className="panel-heading"><p className="eyebrow">Driver account access</p><h2>Sign in to the driver portal</h2><p>Use the phone number attached to your driver authentication record.</p></div><form onSubmit={onSignIn} className="inline-form auth-form"><label>Phone number<input name="phone" type="tel" required placeholder="+256..." /></label><button type="submit">Continue</button></form><button type="button" className="text-button" onClick={onStartRegister}>Register as a driver</button></section>;
  }
  return <section className="auth-welcome panel"><div><p className="eyebrow">Driver access</p><h2>Build a trusted school transport profile.</h2><p>Register or sign in to submit identity evidence, track approval, and unlock vehicle registration.</p></div><div className="auth-step-actions"><button type="button" onClick={onStartRegister}>Register as driver</button><button type="button" className="ghost" onClick={onStartSignIn}>Sign in</button></div></section>;
}

function StatusPill({ status, label }: { status: Status; label?: string }) {
  return <span className={`pill ${status}`}>{label ?? status}</span>;
}

function childById(state: AppState, parentId: string, childId: string) {
  return state.parents.find((parent) => parent.id === parentId)?.children.find((child) => child.id === childId);
}

function schoolName(state: AppState, id: string) {
  return state.schools.find((school) => school.id === id)?.name ?? "School";
}

function vehicleName(state: AppState, id: string) {
  return state.vehicles.find((vehicle) => vehicle.id === id)?.registrationNumber ?? "Assigned vehicle";
}

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString() : "Unscheduled";
}
