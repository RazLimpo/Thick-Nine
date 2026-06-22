'use client';

export default function ValueSection() {
  return (
    <section className="value-prop-section">
      <h2>Work the way you want</h2>

      {/* Step 1: Find */}
      <div className="step">
        <div style={{ fontSize: '2rem', color: '#dc3545', marginBottom: '15px' }}>
          <i className="fas fa-magnifying-glass" />
        </div>
        <h3>1. Find</h3>
        <p>
          Browse profiles and services or post a job to receive proposals.
        </p>
      </div>

      {/* Step 2: Hire */}
      <div className="step">
        <div style={{ fontSize: '2rem', color: '#dc3545', marginBottom: '15px' }}>
          <i className="fas fa-handshake" />
        </div>
        <h3>2. Hire</h3>
        <p>
          Select the best talent, negotiate terms, and officially start the project.
        </p>
      </div>

      {/* Step 3: Pay */}
      <div className="step">
        <div style={{ fontSize: '2rem', color: '#dc3545', marginBottom: '15px' }}>
          <i className="fas fa-credit-card" />
        </div>
        <h3>3. Pay</h3>
        <p>
          Securely deposit payment and approve the final work to release funds.
        </p>
      </div>
    </section>
  );
}