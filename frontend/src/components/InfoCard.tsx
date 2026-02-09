import type {
  SidePanelContent,
  VehicleInfoData,
  ServiceHistoryData,
  PartsListData,
  ServicePackagesData,
} from "../types";
import "./InfoCard.css";

interface Props {
  content: Exclude<SidePanelContent, { type: "job_card" }>;
}

export function InfoCard({ content }: Props) {
  switch (content.type) {
    case "vehicle_info":
      return <VehicleInfoView data={content.data} />;
    case "service_history":
      return <ServiceHistoryView data={content.data} />;
    case "parts_list":
      return <PartsListView data={content.data} />;
    case "service_packages":
      return <ServicePackagesView data={content.data} />;
  }
}

/* ---------- Vehicle Info ---------- */

function VehicleInfoView({ data }: { data: VehicleInfoData }) {
  const { customer, vehicle } = data;
  return (
    <div className="ic-section">
      <div className="ic-grid">
        {customer.name && (
          <div className="ic-field">
            <span className="ic-label">Customer</span>
            <span className="ic-value">{customer.name}</span>
          </div>
        )}
        {customer.phone && (
          <div className="ic-field">
            <span className="ic-label">Phone</span>
            <span className="ic-value">{customer.phone}</span>
          </div>
        )}
        <div className="ic-field">
          <span className="ic-label">Model</span>
          <span className="ic-value">
            {vehicle.model} {vehicle.variant}
          </span>
        </div>
        <div className="ic-field">
          <span className="ic-label">Registration</span>
          <span className="ic-value">{vehicle.registrationNo}</span>
        </div>
        {vehicle.year > 0 && (
          <div className="ic-field">
            <span className="ic-label">Year</span>
            <span className="ic-value">{vehicle.year}</span>
          </div>
        )}
        {vehicle.fuelType && (
          <div className="ic-field">
            <span className="ic-label">Fuel</span>
            <span className="ic-value">{vehicle.fuelType}</span>
          </div>
        )}
        {vehicle.color && (
          <div className="ic-field">
            <span className="ic-label">Color</span>
            <span className="ic-value">{vehicle.color}</span>
          </div>
        )}
        {vehicle.mileage > 0 && (
          <div className="ic-field">
            <span className="ic-label">Mileage</span>
            <span className="ic-value">
              {vehicle.mileage.toLocaleString()} km
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Service History ---------- */

function ServiceHistoryView({ data }: { data: ServiceHistoryData }) {
  return (
    <div className="ic-section">
      {data.vehicleLabel && (
        <div className="ic-subtitle">{data.vehicleLabel}</div>
      )}
      <div className="ic-timeline">
        {data.records.map((r, i) => (
          <div key={i} className="ic-record">
            <div className="ic-record-header">
              <span className="ic-record-date">{r.date}</span>
              <span className={`ic-record-status ic-status-${r.status}`}>
                {r.status}
              </span>
            </div>
            <div className="ic-record-type">{r.type}</div>
            {r.description && (
              <div className="ic-record-desc">{r.description}</div>
            )}
            <div className="ic-record-footer">
              <span className={`ic-record-cost ${r.cost === 0 ? "ic-cost-free" : ""}`}>
                {r.cost === 0 ? "Free" : `₹${r.cost.toLocaleString()}`}
              </span>
              {r.partsReplaced.length > 0 && (
                <div className="ic-tags">
                  {r.partsReplaced.map((p, j) => (
                    <span key={j} className="ic-tag">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {r.nextServiceDate && (
              <div className="ic-record-next">
                Next service: {r.nextServiceDate}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Parts List ---------- */

function PartsListView({ data }: { data: PartsListData }) {
  return (
    <div className="ic-section">
      {data.parts.map((p, i) => (
        <div key={i} className="ic-line-item">
          <div className="ic-line-main">
            <div className="ic-line-info">
              <span className="ic-line-name">{p.name}</span>
              <span className="ic-line-sub">
                {p.partNumber}
                {p.category ? ` · ${p.category}` : ""}
              </span>
            </div>
            <div className="ic-line-right">
              <span className="ic-line-price">
                ₹{p.price.toLocaleString()}
              </span>
              <span
                className={`ic-stock ${p.inStock ? "ic-stock-yes" : "ic-stock-no"}`}
              >
                {p.inStock ? "In Stock" : "Out"}
              </span>
            </div>
          </div>
          {p.compatibleModels && (
            <div className="ic-line-compat">{p.compatibleModels}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Service Packages ---------- */

function ServicePackagesView({ data }: { data: ServicePackagesData }) {
  return (
    <div className="ic-section ic-packages">
      {data.packages.map((pkg) => (
        <div key={pkg.id} className="ic-pkg">
          <div className="ic-pkg-header">
            <div className="ic-pkg-name">{pkg.name}</div>
            <div className="ic-pkg-price">₹{pkg.price.toLocaleString()}</div>
          </div>
          {pkg.description && (
            <div className="ic-pkg-desc">{pkg.description}</div>
          )}
          {pkg.includes.length > 0 && (
            <ul className="ic-pkg-list">
              {pkg.includes.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )}
          {pkg.validityMonths > 0 && (
            <div className="ic-pkg-validity">
              Valid for {pkg.validityMonths} months
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
