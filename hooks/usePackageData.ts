// hooks/usePackageData.ts
import { useState, useCallback } from 'react';
import { PackageTier, PackagesMap, PackageData } from '../types/service.types';
import { INITIAL_PACKAGE_STATE } from '../lib/constants';

export function usePackageData(initialData?: PackagesMap) {
  const [activeTier, setActiveTier] = useState<PackageTier>('basic');
  const [packages, setPackages] = useState<PackagesMap>(
    initialData || INITIAL_PACKAGE_STATE
  );

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