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
  drivers: DriverRecord[];
  schools: SchoolRecord[];
  vehicles: VehicleRecord[];
  schoolIdRequests: SchoolIdRequestRecord[];
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

function normalizeState(state: Partial<AppState>): AppState {
  return {
    parents: state.parents ?? initialState.parents,
    drivers: state.drivers ?? initialState.drivers,
    schools: state.schools ?? initialState.schools,
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

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const selectedDriver = state.drivers.find((driver) => driver.id === selectedDriverId);
  const driverVehicles = useMemo(
    () => state.vehicles.filter((vehicle) => vehicle.driverId === selectedDriverId),
    [selectedDriverId, state.vehicles]
  );

  function commit(updater: (current: AppState) => AppState, audit: string) {
    setState((current) => {
      const next = updater(current);
      return { ...next, audit: [`${new Date().toLocaleString()}: ${audit}`, ...next.audit] };
    });
    setMessage(audit);
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
      (current) => ({ ...current, drivers: [...current.drivers, driver] }),
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
    </main>
  );
}

function StatusPill({ status, label }: { status: Status; label?: string }) {
  return <span className={`pill ${status}`}>{label ?? status}</span>;
}
