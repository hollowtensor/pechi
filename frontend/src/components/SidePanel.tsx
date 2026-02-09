import type { SidePanelItem, JobCard } from "../types";
import { InfoCard } from "./InfoCard";
import { JobCardPanel } from "./JobCardPanel";
import "./SidePanel.css";

interface Props {
  panels: SidePanelItem[];
  onToggleExpand: (panelId: string) => void;
  onDismiss: (panelId: string) => void;
  onConfirmJobCard: (jobCard: JobCard) => void;
  onCancelJobCard: (panelId: string) => void;
  onUpdateJobCard: (panelId: string, jobCard: JobCard) => void;
}

const TYPE_LABELS: Record<string, string> = {
  vehicle_info: "Vehicle",
  service_history: "History",
  parts_list: "Parts",
  service_packages: "Packages",
  job_card: "Job Card",
};

export function SidePanel({
  panels,
  onToggleExpand,
  onDismiss,
  onConfirmJobCard,
  onCancelJobCard,
  onUpdateJobCard,
}: Props) {
  if (panels.length === 0) return null;

  return (
    <>
      {panels.map((panel) => (
        <div
          key={panel.id}
          className={`sp-card ${panel.isExpanded ? "sp-expanded" : "sp-collapsed"}`}
        >
          <div className="sp-header" onClick={() => onToggleExpand(panel.id)}>
            <div className="sp-header-left">
              <span
                className={`sp-badge ${panel.isActionable ? "sp-badge-action" : ""}`}
              >
                {TYPE_LABELS[panel.panelType] || panel.panelType}
              </span>
              <span className="sp-title">{panel.title}</span>
            </div>
            <div className="sp-header-right">
              {!panel.isActionable && (
                <button
                  className="sp-dismiss"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(panel.id);
                  }}
                  title="Dismiss"
                >
                  &times;
                </button>
              )}
              <span className={`sp-chevron ${panel.isExpanded ? "sp-chevron-open" : ""}`}>
                &#9662;
              </span>
            </div>
          </div>

          <div className="sp-body-wrap">
            <div className="sp-body">
              {panel.content.type === "job_card" ? (
                <JobCardPanel
                  jobCard={panel.content.data}
                  onConfirm={onConfirmJobCard}
                  onCancel={() => onCancelJobCard(panel.id)}
                  onUpdate={(jc) => onUpdateJobCard(panel.id, jc)}
                  embedded
                />
              ) : (
                <InfoCard content={panel.content} />
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
