/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { CockpitDashboard } from './components/dashboard/CockpitDashboard';
import { DeliveriesView } from './components/operations/DeliveriesView';
import { ReconciliationView } from './components/operations/ReconciliationView';
import { FieldHandoverView } from './components/operations/FieldHandoverView';
import { ContractsView } from './components/commercial/ContractsView';
import { CustomersProjectsView } from './components/commercial/CustomersProjectsView';
import { LogisticsView } from './components/logistics/LogisticsView';
import { HppFinanceView } from './components/finance/HppFinanceView';
import { InvoicesView } from './components/finance/InvoicesView';
import { PaymentsView } from './components/finance/PaymentsView';
import { MasterDataView } from './components/master/MasterDataView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditAdminView } from './components/audit/AuditAdminView';
import { AuthGate } from './components/auth/AuthGate';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNewDelivery={() => setActiveTab('deliveries')}
        />

        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && <CockpitDashboard onNavigate={setActiveTab} />}
          {activeTab === 'field-handover' && (
            <FieldHandoverView
              onNavigateToDeliveries={() => setActiveTab('deliveries')}
              onNavigateToReconcile={() => setActiveTab('reconciliation')}
            />
          )}
          {activeTab === 'deliveries' && (
            <DeliveriesView onNavigateToReconcile={() => setActiveTab('reconciliation')} />
          )}
          {activeTab === 'reconciliation' && <ReconciliationView />}
          {activeTab === 'contracts' && <ContractsView />}
          {activeTab === 'customers-projects' && <CustomersProjectsView />}
          {activeTab === 'logistics' && <LogisticsView />}
          {activeTab === 'hpp-finance' && <HppFinanceView />}
          {activeTab === 'invoices' && <InvoicesView />}
          {activeTab === 'payments' && <PaymentsView />}
          {activeTab === 'master-data' && <MasterDataView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'audit-admin' && <AuditAdminView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AuthGate>
        <MainLayout />
      </AuthGate>
    </AppProvider>
  );
}