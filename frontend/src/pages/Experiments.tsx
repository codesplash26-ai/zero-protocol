import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Section } from '../components/ui/Section';
import { LiveDataState } from '../components/ui/LiveDataState';
import { ExperimentPortfolioSummary } from '../components/experiments/ExperimentPortfolioSummary';
import { ExperimentListTable } from '../components/experiments/ExperimentListTable';
import { ExperimentDetailDrawer } from '../components/experiments/ExperimentDetailDrawer';
import { AddExperimentModal } from '../components/experiments/AddExperimentModal';
import { useGovernorData } from '../state/governorContext';
import { useApiResource } from '../hooks/useApiResource';
import { api } from '../api/endpoints';
import { describeApiError } from '../lib/apiErrors';
import { Plus, UploadCloud } from 'lucide-react';

export const Experiments: React.FC = () => {
  const { stateVersion, refreshedAt, error: overviewError, refresh } = useGovernorData();
  const experiments = useApiResource('experiments', () => api.listExperiments(), refreshedAt);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const list = experiments.data ?? [];
  const selectedExperiment = list.find((item) => item.id === selectedId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Experiments"
        description="Candidate experiments and their decision context."
        actions={
          <>
            <Button
              variant="outline"
              icon={<UploadCloud size={16} />}
              disabled
              title="Plan interpretation is not available: the backend has no import interpreter running yet."
            >
              Import Experiment Plan
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setIsAddModalOpen(true)}
              disabled={stateVersion === null}
            >
              Add Experiment
            </Button>
          </>
        }
      />

      {experiments.isLoading ? (
        <LiveDataState kind="loading" title="Loading experiments…" />
      ) : experiments.error && !experiments.data ? (
        <LiveDataState
          kind={experiments.error.isNetworkError || overviewError ? 'unavailable' : 'error'}
          message={describeApiError(experiments.error)}
          action={{ label: 'Retry', onClick: experiments.reload }}
        />
      ) : (
        <>
          {/* 2. PORTFOLIO SUMMARY */}
          <Section>
            <ExperimentPortfolioSummary experiments={list} />
          </Section>

          {/* 3. MAIN EXPERIMENT PORTFOLIO TABLE */}
          <Section>
            <ExperimentListTable experiments={list} onSelectExperiment={(exp) => setSelectedId(exp.id)} />
          </Section>
        </>
      )}

      {/* 4. DRAWERS & MODALS */}
      <ExperimentDetailDrawer experiment={selectedExperiment} experiments={list} onClose={() => setSelectedId(null)} />

      <AddExperimentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        stateVersion={stateVersion}
        onCreated={() => void refresh()}
      />
    </div>
  );
};

export default Experiments;
