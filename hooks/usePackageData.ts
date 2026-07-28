// hooks/usePackageData.ts

// ==========================================
// BLOCK 1: IMPORTS & HOOK DEFINITION
// ==========================================
import { useState, useCallback } from 'react';
import { PackageTier, PackagesMap, PackageData } from '../types/service.types';
import { INITIAL_PACKAGE_STATE } from '../lib/constants';

export interface UsePackageDataReturn {
  activeTier: PackageTier;
  setActiveTier: (tier: PackageTier) => void;
  packages: PackagesMap;
  setPackages: React.Dispatch<React.SetStateAction<PackagesMap>>;
  currentPackage: PackageData;
  updatePackageField: (tier: PackageTier, field: keyof PackageData, value: string) => void;
}

export function usePackageData(initialData?: PackagesMap): UsePackageDataReturn {
  const [activeTier, setActiveTier] = useState<PackageTier>('basic');
  const [packages, setPackages] = useState<PackagesMap>(
    initialData || INITIAL_PACKAGE_STATE
  );
    
    
    // ==========================================
// BLOCK 2: FIELD UPDATES & HOOK RETURN
// ==========================================
  const updatePackageField = useCallback((
    tier: PackageTier,
    field: keyof PackageData,
    value: string
  ) => {
    setPackages(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value
      }
    }));
  }, []);

  const currentPackage = packages[activeTier];

  return {
    activeTier,
    setActiveTier,
    packages,
    setPackages,
    currentPackage,
    updatePackageField
  };
}


