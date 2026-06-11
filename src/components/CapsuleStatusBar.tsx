import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PipelineItem {
  rank: number;
  tool_name: string;
  score: number;
  niche: string;
  status: string;
  scores?: {
    traffic: number;
    cpc: number;
    repeat: number;
    share: number;
    build: number;
  };
  kill_reason?: string;
  competitors?: string[];
}

interface CapsuleState {
  session_number: number;
  validated_count: number;
  raw_ideas_count: number;
  pipeline: PipelineItem[];
  next_actions?: string[];
}

export function CapsuleStatusBar({ capsule }: { capsule: CapsuleState | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!capsule || !capsule.pipeline) return null;

  const activeIdeas = capsule.pipeline.filter(p => p.status === 'raw-idea');
  
  // Calculate Health Flags
  const healthFlags: { type: 'success' | 'warning'; text: string }[] = [];

  // Check 1: Minimum score threshold (35/50)
  const lowScoreIdeas = activeIdeas.filter(p => p.score < 35);
  if (lowScoreIdeas.length > 0) {
    healthFlags.push({
      type: 'warning',
      text: `Raw idea "${lowScoreIdeas[0].tool_name}" has score ${lowScoreIdeas[0].score}/50 (below threshold 35).`
    });
  } else {
    healthFlags.push({
      type: 'success',
      text: 'All active ideas meet the minimum score threshold (35/50).'
    });
  }

  // Check 2: Competitor limit (3 competitors max)
  const highCompetitorIdeas = activeIdeas.filter(p => p.competitors && p.competitors.length >= 3);
  if (highCompetitorIdeas.length > 0) {
    healthFlags.push({
      type: 'warning',
      text: `"${highCompetitorIdeas[0].tool_name}" has ${highCompetitorIdeas[0].competitors?.length} competitors (limit: < 3).`
    });
  } else {
    healthFlags.push({
      type: 'success',
      text: 'No active ideas exceed the competitor density limit.'
    });
  }

  // Check 3: Niche check (Finance, Legal, Insurance, B2B only)
  const approvedNiches = ['Finance', 'Legal', 'Insurance', 'B2B'];
  const invalidNicheIdeas = activeIdeas.filter(p => !approvedNiches.includes(p.niche));
  if (invalidNicheIdeas.length > 0) {
    healthFlags.push({
      type: 'warning',
      text: `"${invalidNicheIdeas[0].tool_name}" targets niche "${invalidNicheIdeas[0].niche}" outside approved sectors.`
    });
  } else {
    healthFlags.push({
      type: 'success',
      text: 'All active ideas target approved US industries.'
    });
  }

  const nextSessionNum = capsule.session_number + 1;

  // Determine next session type name
  const getNextSessionType = (num: number) => {
    const types = ['Scoring', 'Intel', 'Validation', 'Review'];
    return types[num % types.length];
  };

  return (
    <div className="capsule-status-bar-wrapper">
      <div 
        className="capsule-status-bar" 
        onClick={() => setExpanded(!expanded)}
        title="Click to view detailed capsule panel"
      >
        <div className="status-bar-left">
          <Play size={11} className="session-run-icon" />
          <span className="status-session-num">Session #{capsule.session_number}</span>
          <span className="status-divider">|</span>
          <span className="status-validated-count">🟢 {capsule.validated_count} validated</span>
          <span className="status-divider">|</span>
          <span className="status-raw-count">🔴 {capsule.raw_ideas_count} raw ideas</span>
        </div>

        <div className="status-bar-right">
          <span className="status-next-session">Next: Session #{nextSessionNum} — {getNextSessionType(nextSessionNum)}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded Drawer */}
      {expanded && (
        <motion.div 
          className="capsule-expanded-drawer glass-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="drawer-grid">
            {/* Health Flags */}
            <div className="drawer-column">
              <h4>Health Flags</h4>
              <div className="health-flags-list">
                {healthFlags.map((flag, idx) => (
                  <div key={idx} className={`health-flag-item ${flag.type}`}>
                    {flag.type === 'success' ? (
                      <CheckCircle size={14} className="flag-icon-success" />
                    ) : (
                      <AlertTriangle size={14} className="flag-icon-warning" />
                    )}
                    <span>{flag.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Session History dots */}
            <div className="drawer-column">
              <h4>Session History</h4>
              <div className="session-dots-container">
                {Array.from({ length: Math.max(8, capsule.session_number) }).map((_, idx) => {
                  const sNum = idx + 1;
                  const isCurrent = sNum === capsule.session_number;
                  const isPast = sNum < capsule.session_number;
                  
                  return (
                    <div 
                      key={sNum} 
                      className={`session-dot-wrapper ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
                      title={isCurrent ? `Active Session #${sNum}` : `Session #${sNum}`}
                    >
                      <div className="session-dot" />
                      <span className="session-dot-label">S{sNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Actions */}
            <div className="drawer-column">
              <h4>Next Actions Queue</h4>
              <div className="next-actions-list">
                {capsule.next_actions && capsule.next_actions.length > 0 ? (
                  capsule.next_actions.map((action, idx) => (
                    <div key={idx} className="next-action-item">
                      <div className="next-action-bullet" />
                      <span>{action}</span>
                    </div>
                  ))
                ) : (
                  <div className="next-action-empty">
                    <HelpCircle size={14} />
                    <span>No next actions listed in capsule.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
