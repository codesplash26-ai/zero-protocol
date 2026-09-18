import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Section } from '../components/ui/Section';
import { ExperimentPortfolioSummary } from '../components/experiments/ExperimentPortfolioSummary';
import { ExperimentListTable } from '../components/experiments/ExperimentListTable';
import { ExperimentDetailDrawer } from '../components/experiments/ExperimentDetailDrawer';
import { AddExperimentModal } from '../components/experiments/AddExperimentModal';
import { ImportExperimentModal } from '../components/experiments/ImportExperimentModal';
import { initialExperiments } from '../mock/experiments';
import type { DetailedExperiment } from '../mock/experiments';
import { Plus, UploadCloud } from 'lucide-react';

export const Experiments: React.FC = () => {
  const [experimentsList, setExperimentsList] = useState<DetailedExperiment[]>(initialExperiments);
  const [selectedExperiment, setSelectedExperiment] = useState<DetailedExperiment | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleAddExperiment = (newExp: DetailedExperiment) => {
    setExperimentsList((prev) => [newExp, ...prev]);
  };

  const handleConfirmImportedExperiment = (importedExp: DetailedExperiment) => {
    setExperimentsList((prev) => [importedExp, ...prev]);
  };

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
              onClick={() => setIsImportModalOpen(true)}
            >
              Import Experiment Plan
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Experiment
            </Button>
          </>
        }
      />

      {/* 2. PORTFOLIO SUMMARY */}
      <Section>
        <ExperimentPortfolioSummary experiments={experimentsList} />
      </Section>

      {/* 3. MAIN EXPERIMENT PORTFOLIO TABLE */}
      <Section>
        <ExperimentListTable
          experiments={experimentsList}
          onSelectExperiment={(exp) => setSelectedExperiment(exp)}
        />
      </Section>

      {/* 4. DRAWERS & MODALS */}
      <ExperimentDetailDrawer
        experiment={selectedExperiment}
        onClose={() => setSelectedExperiment(null)}
      />

      <AddExperimentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddExperiment={handleAddExperiment}
      />

      <ImportExperimentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImportedExperiment={handleConfirmImportedExperiment}
      />
    </div>
  );
};

export default Experiments;
