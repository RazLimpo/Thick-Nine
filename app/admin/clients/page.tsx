export default function AdminClientsPage() {
    return (
      <div className="admin-page">
        <div className="page-header">
          <h1>Clients Management</h1>
          <p>View, manage, and audit registered client accounts.</p>
        </div>
  
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#USR-8041</td>
                <td>Alex Vance</td>
                <td>Affiliate Partner</td>
                <td><span className="status-badge active">Active</span></td>
                <td><button className="btn-action">Manage</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }