import './App.css';
import { useState, useEffect } from 'react';

/* ── SVG Icon Components ── */
const IconGlobe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);
const IconInfinity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4z"/>
    <path d="M12 12c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z"/>
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const IconTrophy = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
);
const IconFlame = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);
const IconVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
);
const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2z"/>
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconLoader = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="spin-icon">
    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>
);

const detectProvider = (phoneNumber) => {
  if (!phoneNumber) return null;
  const d = phoneNumber.substring(0, 4);
  if (['0720','0721','0722','0723','0724','0725','0726','0727','0728','0729','0768','0769'].includes(d)) return 'safaricom';
  if (['0710','0711','0712','0713','0714','0715','0716','0717','0718','0719','0780','0781','0782','0783','0784','0785','0786','0787','0788','0789'].includes(d)) return 'airtel';
  return 'safaricom';
};

// Badge config keyed by bundle name
const BADGES = {
  '1 Hour Unlimited':  { label: 'Hot Deal',     cls: 'badge-hot',     Icon: IconFlame },
  '6 Hours Unlimited': { label: 'Quick Pick',   cls: 'badge-quick',   Icon: IconZap },
  'Daily Unlimited':   { label: 'Best Starter', cls: 'badge-starter', Icon: IconStar },
  'Weekly Basic':      { label: 'Budget Pick',  cls: 'badge-budget',  Icon: IconShield },
  'Standard':          { label: 'Most Popular', cls: 'badge-popular', Icon: IconStar },
  'Monthly Pro':       { label: 'Best Value',   cls: 'badge-value',   Icon: IconTrophy },
  'Blazing':           { label: 'Pro',           cls: 'badge-pro',     Icon: IconZap },
};

// Format the duration label
const durationLabel = (days) => {
  if (!days || days === 0) return null;
  if (days === 1)  return '24 hrs';
  if (days === 7)  return '7 days';
  if (days === 30) return '30 days';
  return `${days} days`;
};

// Format time label for hourly bundles
const timeLabel = (name) => {
  if (name === '1 Hour Unlimited')  return '1 hr';
  if (name === '6 Hours Unlimited') return '6 hrs';
  return null;
};

function App() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://isp.zetahub.africa/api'}/bundles`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBundles(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching bundles:', err);
      setError('Failed to load bundles. Make sure the backend is running on port 5000.');
      setBundles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBundle = (bundle) => {
    setSelectedBundle(bundle);
    setShowPaymentModal(true);
    setPhoneNumber('');
    setPaymentMessage('');
  };

  const handleConfirmPurchase = async () => {
    if (!phoneNumber.trim()) {
      setPaymentMessage('Please enter a phone number');
      return;
    }

    if (phoneNumber.length < 10) {
      setPaymentMessage('Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    setPaymentMessage('');

    // Auto-detect provider
    const detectedProvider = detectProvider(phoneNumber);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://isp.zetahub.africa/api'}/payment/initiate-stk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bundleId: selectedBundle.id,
          phoneNumber: phoneNumber,
          provider: detectedProvider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment initiation failed');
      }

      setPaymentMessage(`Payment prompt sent to ${phoneNumber}. Complete the payment on your phone.`);
      setTimeout(() => {
        setShowPaymentModal(false);
      }, 3000);
    } catch (err) {
      console.error('Error initiating payment:', err);
      setPaymentMessage(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPhoneNumber('');
    setPaymentMessage('');
  };

  const detectedProvider = phoneNumber ? detectProvider(phoneNumber) : null;

  // Group bundles: short-term (hourly/daily) vs long-term
  const shortBundles = bundles.filter(b => b.duration_days === 0 || b.duration_days === 1);
  const longBundles  = bundles.filter(b => b.duration_days > 1);

  const BundleCard = ({ bundle }) => {
    const badge = BADGES[bundle.name];
    const tlabel = timeLabel(bundle.name);
    const dlabel = durationLabel(bundle.duration_days);
    const durationDisplay = tlabel || dlabel || '—';
    const isHot = bundle.name === '1 Hour Unlimited';

    return (
      <div className={`card ${isHot ? 'card-hot' : ''} ${badge ? 'card-has-badge' : ''}`}>
        {badge && (
          <span className={`card-badge ${badge.cls}`}>
            <span className="badge-ico"><badge.Icon /></span>{badge.label}
          </span>
        )}

        <div className="card-top">
          <h3 className="card-name">{bundle.name}</h3>
          {bundle.description && <p className="card-desc">{bundle.description}</p>}
        </div>

        <div className="card-price-block">
          <span className="card-currency">KES</span>
          <span className="card-amount">{Number(bundle.price).toLocaleString()}</span>
        </div>

        <div className="card-chips">
          <span className="chip chip-unlimited"><span className="chip-ico"><IconInfinity /></span> Unlimited</span>
          <span className="chip chip-duration"><span className="chip-ico"><IconClock /></span> {durationDisplay}</span>
        </div>

        <button className={`card-btn ${isHot ? 'card-btn-hot' : ''}`} onClick={() => handleSelectBundle(bundle)}>
          Buy Now
        </button>
      </div>
    );
  };

  return (
    <div className="App">

      {/* ── HEADER ── */}
      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon"><IconGlobe /></span>
            <span className="logo-text">NetBundles</span>
          </div>
          <p className="header-tagline">Fast · Reliable · Affordable Internet</p>
        </div>
        <div className="header-wave" />
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">

        {error && <div className="alert-error"><span className="chip-ico"><IconShield /></span> {error}</div>}

        {loading && (
          <div className="loading-state">
            <span className="loading-icon"><IconLoader /></span>
            <span>Loading plans…</span>
          </div>
        )}

        {!loading && bundles.length > 0 && (
          <>
            {/* Short-term bundles + video ad side by side */}
            {shortBundles.length > 0 && (
              <section className="bundle-section">
                <div className="section-heading">
                  <span className="section-tag"><span className="chip-ico"><IconZap /></span> Limited Time</span>
                  <h2 className="section-title">Short-Term Plans</h2>
                  <p className="section-sub">Get online in minutes — pay as little as KES 10</p>
                </div>
                <div className="short-with-ad">
                  <div className="cards-grid cards-grid-short">
                    {shortBundles.map(b => <BundleCard key={b.id} bundle={b} />)}
                  </div>
                  <div className="ad-slot-inline">
                    <div className="ad-placeholder">
                      <span className="ad-play-icon"><IconPlay /></span>
                      <p className="ad-text">Advertisement</p>
                      <p className="ad-sub">Your video ad appears here</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Long-term bundles */}
            {longBundles.length > 0 && (
              <section className="bundle-section">
                <div className="section-heading">
                  <span className="section-tag"><span className="chip-ico"><IconCalendar /></span> Monthly & Weekly</span>
                  <h2 className="section-title">Long-Term Plans</h2>
                  <p className="section-sub">Save more with our weekly and monthly unlimited packages</p>
                </div>
                <div className="cards-grid">
                  {longBundles.map(b => <BundleCard key={b.id} bundle={b} />)}
                </div>
              </section>
            )}
          </>
        )}

        {!loading && bundles.length === 0 && !error && (
          <div className="loading-state"><p>No plans available at the moment.</p></div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <p>Pay securely via M-Pesa or Airtel Money · 24/7 Support</p>
      </footer>

      {/* ── PAYMENT MODAL ── */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={closePaymentModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            <div className="modal-head">
              <div>
                <p className="modal-subtitle">You selected</p>
                <h2 className="modal-title">{selectedBundle?.name}</h2>
              </div>
              <button className="modal-close" onClick={closePaymentModal} aria-label="Close"><IconX /></button>
            </div>

            <div className="modal-summary">
              <div className="summary-row">
                <span>Speed</span>
                <strong>Unlimited</strong>
              </div>
              <div className="summary-row">
                <span>Valid for</span>
                <strong>
                  {timeLabel(selectedBundle?.name) || durationLabel(selectedBundle?.duration_days) || '—'}
                </strong>
              </div>
              <div className="summary-row summary-total">
                <span>Total</span>
                <strong>KES {Number(selectedBundle?.price).toLocaleString()}</strong>
              </div>
            </div>

            <div className="modal-body">
              <label className="field-label">M-Pesa / Airtel Money Number</label>
              <input
                className="field-input"
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0712 345 678"
                disabled={processing}
                maxLength="12"
              />
              {detectedProvider && (
                <div className="provider-pill">
                  <span className={`provider-dot ${detectedProvider}`} />
                  {detectedProvider === 'safaricom' ? 'Safaricom M-Pesa' : 'Airtel Money'} detected
                </div>
              )}
              {paymentMessage && (
                <div className={`msg ${paymentMessage.includes('Error') ? 'msg-error' : 'msg-success'}`}>
                  <span className="chip-ico">{paymentMessage.includes('Error') ? <IconX /> : <IconCheck />}</span>
                  {paymentMessage.replace('✓ ', '').replace('✗ ', '')}
                </div>
              )}
            </div>

            <div className="modal-foot">
              <button className="btn-cancel" onClick={closePaymentModal} disabled={processing}>Cancel</button>
              <button className="btn-pay" onClick={handleConfirmPurchase} disabled={processing || !phoneNumber.trim()}>
                {processing
                  ? <><span className="loading-icon" style={{display:'inline-flex',verticalAlign:'middle',marginRight:'6px'}}><IconLoader /></span>Sending…</>
                  : <><span className="chip-ico"><IconPhone /></span>Pay KES {Number(selectedBundle?.price).toLocaleString()}</>}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;
