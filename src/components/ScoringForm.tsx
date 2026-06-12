/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Award, CheckCircle, XCircle } from 'lucide-react';
import { parseScoresFromContent } from '../lib/parseScore';

interface ScoringFormProps {
  noteId: string;
  noteContent: string;
  onSaveScore: (scores: {
    traffic: number;
    cpc: number;
    repeat: number;
    share: number;
    build: number;
  }) => Promise<void>;
}

export function ScoringForm({ noteId, noteContent, onSaveScore }: ScoringFormProps) {
  const [traffic, setTraffic] = useState(0);
  const [cpc, setCpc] = useState(0);
  const [repeat, setRepeat] = useState(0);
  const [share, setShare] = useState(0);
  const [build, setBuild] = useState(0);
  const [saving, setSaving] = useState(false);

  // Parse scores from note content on load/update
  useEffect(() => {
    const parsed = parseScoresFromContent(noteContent);
    setTraffic(parsed.traffic);
    setCpc(parsed.cpc);
    setRepeat(parsed.repeat);
    setShare(parsed.share);
    setBuild(parsed.build);
  }, [noteId, noteContent]);

  const total = traffic + cpc + repeat + share + build;
  const isPass = total >= 35;

  const handleInputLimit = (val: string, setter: (num: number) => void) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      setter(0);
    } else {
      setter(Math.max(0, Math.min(10, parsed)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSaveScore({ traffic, cpc, repeat, share, build });
    setSaving(false);
  };

  return (
    <div className="scoring-form-container glass-panel">
      <div className="scoring-form-header">
        <div className="scoring-title-wrapper">
          <Award className="scoring-header-icon" size={16} />
          <h4>SaaS Idea Scoring (0 - 10 each)</h4>
        </div>
        <div className={`scoring-verdict-badge ${isPass ? 'pass' : 'fail'}`}>
          {isPass ? <CheckCircle size={13} /> : <XCircle size={13} />}
          <span>{isPass ? 'Pass ✅' : 'Fail ❌'} (Min: 35)</span>
        </div>
      </div>

      <div className="scoring-inputs-grid">
        <div className="scoring-input-group">
          <label htmlFor="score-traffic">Traffic</label>
          <input
            id="score-traffic"
            type="number"
            min="0"
            max="10"
            value={traffic}
            onChange={(e) => handleInputLimit(e.target.value, setTraffic)}
            className="scoring-input"
          />
        </div>
        <div className="scoring-input-group">
          <label htmlFor="score-cpc">CPC</label>
          <input
            id="score-cpc"
            type="number"
            min="0"
            max="10"
            value={cpc}
            onChange={(e) => handleInputLimit(e.target.value, setCpc)}
            className="scoring-input"
          />
        </div>
        <div className="scoring-input-group">
          <label htmlFor="score-repeat">Repeat</label>
          <input
            id="score-repeat"
            type="number"
            min="0"
            max="10"
            value={repeat}
            onChange={(e) => handleInputLimit(e.target.value, setRepeat)}
            className="scoring-input"
          />
        </div>
        <div className="scoring-input-group">
          <label htmlFor="score-share">Share</label>
          <input
            id="score-share"
            type="number"
            min="0"
            max="10"
            value={share}
            onChange={(e) => handleInputLimit(e.target.value, setShare)}
            className="scoring-input"
          />
        </div>
        <div className="scoring-input-group">
          <label htmlFor="score-build">Build</label>
          <input
            id="score-build"
            type="number"
            min="0"
            max="10"
            value={build}
            onChange={(e) => handleInputLimit(e.target.value, setBuild)}
            className="scoring-input"
          />
        </div>

        {/* Total Display */}
        <div className="scoring-total-display">
          <span className="total-label">Total</span>
          <span className={`score-total-large ${isPass ? 'pass' : 'fail'}`}>
            {total}
          </span>
        </div>
      </div>

      <div className="scoring-form-footer">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{ padding: '6px 16px', fontSize: '13px' }}
        >
          {saving ? 'Saving...' : 'Save Score'}
        </button>
      </div>
    </div>
  );
}
