import React from 'react';
import { useApp } from '../../context/AppContext';
import { CaseEntryModal } from './CaseEntryModal';

export const CaseEntryForm: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <CaseEntryModal
      isOpen={true}
      onClose={() => setCurrentView('cases')}
    />
  );
};
