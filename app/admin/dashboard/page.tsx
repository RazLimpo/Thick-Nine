export default function AdminDashboardPage() {
    return (
      <div className="admin-page">
        <div className="page-header">
          <h1>Overview Dashboard</h1>
          <p>Real-time platform metrics and activity status.</p>
        </div>
  
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-title">Total Clients</span>
            <p className="metric-value">1,248</p>
          </div>
          <div className="metric-card">
            <span className="metric-title">Pending Payouts</span>
            <p className="metric-value">$4,850.00</p>
          </div>
          <div className="metric-card">
            <span className="metric-title">Platform Revenue</span>
            <p className="metric-value">$32,120.00</p>
          </div>
        </div>
      </div>
    );
  }