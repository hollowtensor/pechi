import type { JobCard } from "../types";
import "./JobCardPanel.css";

interface Props {
  jobCard: JobCard;
  onConfirm: (jobCard: JobCard) => void;
  onCancel: () => void;
  onUpdate: (jobCard: JobCard) => void;
  embedded?: boolean;
}

export function JobCardPanel({
  jobCard,
  onConfirm,
  onCancel,
  onUpdate,
  embedded = false,
}: Props) {
  const handleRemovePart = (index: number) => {
    const parts = jobCard.parts.filter((_, i) => i !== index);
    const total =
      (jobCard.servicePackage?.price ?? 0) +
      parts.reduce((s, p) => s + p.totalPrice, 0);
    onUpdate({ ...jobCard, parts, totalEstimate: total });
  };

  const handleRemovePackage = () => {
    const total = jobCard.parts.reduce((s, p) => s + p.totalPrice, 0);
    onUpdate({ ...jobCard, servicePackage: null, totalEstimate: total });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...jobCard, preferredDate: e.target.value });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...jobCard, notes: e.target.value });
  };

  const content = (
    <>
      {/* Customer & Vehicle */}
      <div className="jc-section">
        <h3>Customer & Vehicle</h3>
        <div className="jc-grid">
          <div className="jc-field">
            <span className="jc-label">Customer</span>
            <span className="jc-value">{jobCard.customer.name}</span>
          </div>
          <div className="jc-field">
            <span className="jc-label">Phone</span>
            <span className="jc-value">{jobCard.customer.phone}</span>
          </div>
          <div className="jc-field">
            <span className="jc-label">Vehicle</span>
            <span className="jc-value">
              {jobCard.vehicle.model} {jobCard.vehicle.variant}
            </span>
          </div>
          <div className="jc-field">
            <span className="jc-label">Registration</span>
            <span className="jc-value">{jobCard.vehicle.registrationNo}</span>
          </div>
          <div className="jc-field">
            <span className="jc-label">Mileage</span>
            <span className="jc-value">
              {jobCard.vehicle.mileage.toLocaleString()} km
            </span>
          </div>
        </div>
      </div>

      {/* Service Package */}
      {jobCard.servicePackage && (
        <div className="jc-section">
          <h3>Service Package</h3>
          <div className="jc-pkg">
            <div className="jc-pkg-top">
              <div>
                <div className="jc-pkg-name">{jobCard.servicePackage.name}</div>
                <div className="jc-pkg-price">
                  ₹{jobCard.servicePackage.price.toLocaleString()}
                </div>
              </div>
              <button
                className="jc-remove"
                onClick={handleRemovePackage}
                title="Remove package"
              >
                &times;
              </button>
            </div>
            <ul className="jc-pkg-list">
              {jobCard.servicePackage.includes.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Parts */}
      {jobCard.parts.length > 0 && (
        <div className="jc-section">
          <h3>Parts</h3>
          {jobCard.parts.map((part, i) => (
            <div key={i} className="jc-line-item">
              <div className="jc-line-info">
                <span className="jc-line-name">{part.name}</span>
                <span className="jc-line-sub">{part.partNumber}</span>
              </div>
              <span className="jc-line-price">
                ₹{part.totalPrice.toLocaleString()}
              </span>
              <button
                className="jc-remove"
                onClick={() => handleRemovePart(i)}
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preferred Date */}
      <div className="jc-section">
        <h3>Preferred Date</h3>
        <input
          type="date"
          className="jc-date"
          value={jobCard.preferredDate}
          onChange={handleDateChange}
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Notes */}
      <div className="jc-section">
        <h3>Notes</h3>
        <textarea
          className="jc-notes"
          value={jobCard.notes}
          onChange={handleNotesChange}
          placeholder="Any special requests..."
          rows={2}
        />
      </div>

      {/* Footer */}
      <div className="jc-footer">
        <div className="jc-total">
          <span className="jc-total-label">Total Estimate</span>
          <span className="jc-total-amount">
            ₹{jobCard.totalEstimate.toLocaleString()}
          </span>
        </div>
        <div className="jc-actions">
          <button className="jc-btn jc-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="jc-btn jc-btn-confirm"
            onClick={() => onConfirm(jobCard)}
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="jc-embedded">{content}</div>;
  }

  return (
    <div className="jc-overlay" onClick={onCancel}>
      <div className="jc-panel" onClick={(e) => e.stopPropagation()}>
        <div className="jc-header">
          <h2>Service Job Card</h2>
          <button onClick={onCancel} className="jc-close">
            &times;
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
