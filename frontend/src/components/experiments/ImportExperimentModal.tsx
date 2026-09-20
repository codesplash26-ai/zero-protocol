import React, { useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { mockInterpretedExperiment } from '../../mock/experiments';
import type { Experiment } from '../../mock/pulseboard';
import {
  X,
  UploadCloud,
  FileText,
  FileCheck,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export interface ImportExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImportedExperiment: (exp: Experiment) => void;
}

type ImportStep = 'intake' | 'interpreting' | 'review' | 'confirmed';

export const ImportExperimentModal: React.FC<ImportExperimentModalProps> = ({
  isOpen,
  onClose,
  onConfirmImportedExperiment,
}) => {
  const [step, setStep] = useState<ImportStep>('intake');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartInterpreting = (fileName?: string) => {
    if (fileName) setSelectedFile(fileName);
    setStep('interpreting');
    setTimeout(() => {
      setStep('review');
    }, 1200);
  };

  const handleConfirm = () => {
    const expToConfirm: Experiment = {
      ...mockInterpretedExperiment,
      id: `EXP-00${Math.floor(Math.random() * 900) + 100}`,
      provenance: {
        source: selectedFile ? `Document (${selectedFile})` : 'Pasted Founder Notes',
        quality: 'HIGH',
      },
    };
    onConfirmImportedExperiment(expToConfirm);
    setStep('confirmed');
    setTimeout(() => {
      setStep('intake');
      onClose();
    }, 1200);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          zIndex: 40,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal Container */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-governor-teal-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-governor-teal)',
                }}
              >
                <FileCheck size={18} />
              </div>
              <div>
                <CardTitle style={{ fontSize: '1.125rem' }}>Import Experiment Plan</CardTitle>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Provide an experiment plan document or notes to interpret into a normalized model.
                </div>
              </div>
            </div>
            <IconButton icon={<X size={20} />} ariaLabel="Close modal" onClick={onClose} />
          </div>
        </CardHeader>

        <CardContent style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* STEP 1: INTAKE SCREEN */}
          {step === 'intake' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Document Dropzone */}
              <div
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-bg)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
                onClick={() => handleStartInterpreting('Growth_Experiment_Plan.pdf')}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-accent-blue-light)',
                    color: 'var(--color-accent-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem auto',
                  }}
                >
                  <UploadCloud size={24} />
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  Drop an experiment plan document here
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Supports PDF, DOCX, TXT files
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartInterpreting('Experiment_Brief_v2.docx');
                    }}
                  >
                    Choose File
                  </Button>
                </div>
              </div>

              {/* Text Input / Paste Option */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--color-text-main)',
                    marginBottom: '0.375rem',
                  }}
                >
                  Or paste unstructured experiment notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste unstructured founder notes, customer interview logs, or slack messages..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--color-text-main)',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="teal"
                  icon={<Sparkles size={16} />}
                  onClick={() => handleStartInterpreting()}
                  disabled={!pastedText.trim() && !selectedFile}
                >
                  Interpret Plan
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: INTERPRETING LOADING STATE */}
          {step === 'interpreting' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1.5rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-governor-teal-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-governor-teal)',
                  marginBottom: '1rem',
                }}
              >
                <Cpu size={24} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                Interpreting experiment plan...
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Extracting hypothesis, resource requirements, and constraints into normalized experiment schema.
              </p>
            </div>
          )}

          {/* STEP 3: AI INTERPRETED REVIEW SCREEN (Human-in-the-loop) */}
          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Review Header Banner */}
              <div
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-governor-teal-light)',
                  border: '1px solid #99F6E4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--color-governor-teal)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-governor-teal)' }}>
                    AI INTERPRETED EXPERIMENT PROPOSAL
                  </span>
                </div>
                <Badge variant="teal" size="sm">
                  Review & Confirm Required
                </Badge>
              </div>

              {/* Extracted Experiment Title & Hypothesis */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  EXTRACTED NAME
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                  {mockInterpretedExperiment.name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                  {mockInterpretedExperiment.short_description}
                </div>
              </div>

              {/* Extracted Hypothesis */}
              <div
                style={{
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-accent-blue)' }}>
                  EXTRACTED HYPOTHESIS
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginTop: '0.25rem' }}>
                  "{mockInterpretedExperiment.hypothesis}"
                </div>
              </div>

              {/* Extracted Parameters Grid with Provenance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    ENG HOURS
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {mockInterpretedExperiment.engineering_hours}h
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Source: Experiment Plan
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    TRAFFIC
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {mockInterpretedExperiment.traffic_required?.toLocaleString()} sessions
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Source: Experiment Plan
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    DURATION
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {mockInterpretedExperiment.duration}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Source: Experiment Plan
                  </div>
                </div>
              </div>

              {/* Missing Information Warning */}
              {mockInterpretedExperiment.missing_fields && mockInterpretedExperiment.missing_fields.length > 0 && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-warning-bg)',
                    border: '1px solid #FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    fontSize: '0.8125rem',
                    color: 'var(--color-warning)',
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>⚠ Missing Information:</strong> {mockInterpretedExperiment.missing_fields.join(', ')} (Will default to $0 or require manual edit).
                  </div>
                </div>
              )}

              {/* Provenance & Confidence footer */}
              {mockInterpretedExperiment.provenance && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <FileText size={14} style={{ color: 'var(--color-accent-blue)' }} />
                    <span>Provenance: {mockInterpretedExperiment.provenance.source}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <ShieldCheck size={14} style={{ color: 'var(--color-governor-teal)' }} />
                    <span>Extraction Quality: {mockInterpretedExperiment.provenance.quality}</span>
                  </div>
                </div>
              )}

              {/* Review Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <Button variant="outline" icon={<Edit2 size={14} />} onClick={() => setStep('intake')}>
                  Edit Source / Re-upload
                </Button>
                <Button variant="teal" icon={<CheckCircle2 size={16} />} onClick={handleConfirm}>
                  Confirm Experiment
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMED SUCCESS STATE */}
          {step === 'confirmed' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1.5rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-success)',
                  marginBottom: '1rem',
                }}
              >
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                Experiment Confirmed & Portfolio Updated
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Normalized experiment added to candidate portfolio for Governor evaluation.
              </p>
            </div>
          )}
        </CardContent>
      </div>
    </>
  );
};
