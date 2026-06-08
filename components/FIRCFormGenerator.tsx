import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ForeignRemittance, Customer } from '../types';
import { numberToWords } from '../utils/numberToWords';
import { Modal } from './Modal';

interface FIRCFormGeneratorProps {
  remittance: ForeignRemittance;
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

/*
 * Federal Bank "Disposal Instruction for Foreign Inward Remittance"
 * Overlay positions derived from the original PDF at native point scale.
 * PDF page = 595 x 842 pts. Background PNGs are rendered at 150 DPI
 * and scaled back to 595 x 842 via CSS background-size.
 */

const PAGE_W = 595;
const PAGE_H = 842;

// Purpose codes used on the Federal Bank form
const PURPOSE_OPTIONS = [
  { code: 'P1022', label: 'Exam Registration' },
  { code: 'P0802', label: 'Testing Services' },
  { code: 'P0101', label: 'Goods Export' },
  { code: 'P0801', label: 'Education & Training' },
];

export const FIRCFormGenerator: React.FC<FIRCFormGeneratorProps> = ({
  remittance,
  customer,
  isOpen,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Editable fields
  const [remitterName, setRemitterName] = useState(customer.name);
  const [remitterAddress, setRemitterAddress] = useState(
    [customer.address, customer.country].filter(Boolean).join(', ') || ''
  );
  const [amountFigures, setAmountFigures] = useState(
    String(remittance.foreign_amount || 0)
  );
  const [purpose, setPurpose] = useState(PURPOSE_OPTIONS[0].label);
  const [purposeCode, setPurposeCode] = useState(PURPOSE_OPTIONS[0].code);
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setRemitterName(customer.name);
      setRemitterAddress([customer.address, customer.country].filter(Boolean).join(', ') || '');
      setAmountFigures(String(remittance.foreign_amount || 0));
      setPurpose(PURPOSE_OPTIONS[0].label);
      setPurposeCode(PURPOSE_OPTIONS[0].code);
      setFormDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, customer, remittance]);

  const amountWords = useMemo(() => {
    const n = parseFloat(amountFigures);
    if (Number.isNaN(n) || n <= 0) return '';
    return numberToWords(n);
  }, [amountFigures]);

  const currencyLabel = remittance.currency || 'USD';
  const currencyWord = currencyLabel === 'USD' ? 'DOLLARS' : currencyLabel === 'EUR' ? 'EURO' : currencyLabel === 'GBP' ? 'POUNDS' : currencyLabel;

  const handlePrint = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body * { visibility: hidden !important; }
        .firc-print-root, .firc-print-root * { visibility: visible !important; }
        .firc-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        .firc-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; border: none !important; }
        .firc-page:last-child { page-break-after: auto; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  // Overlay text style — white bg to "white-out" the template's old values
  const overlayBase: React.CSSProperties = {
    position: 'absolute',
    fontFamily: "'Arial', sans-serif",
    color: '#000',
    backgroundColor: '#fff',
    lineHeight: 1.2,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Federal Bank — FIRC Form" maxWidthClass="max-w-4xl">
      <div className="space-y-4">
        {/* Edit panel */}
        <div className="glass-panel rounded-xl p-4 border border-money-gold/15">
          <h4 className="text-xs font-bold text-money-gold uppercase tracking-wider mb-3">Edit Variable Fields</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Remitter Name</label>
              <input value={remitterName} onChange={(e) => setRemitterName(e.target.value)} className="neo-input w-full rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Date</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="neo-input w-full rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Remitter Address</label>
              <textarea value={remitterAddress} onChange={(e) => setRemitterAddress(e.target.value)} rows={2} className="neo-input w-full rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Amount (figures)</label>
              <input value={amountFigures} onChange={(e) => setAmountFigures(e.target.value)} className="neo-input w-full rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Amount (words)</label>
              <input value={amountWords} readOnly className="neo-input w-full rounded-lg px-3 py-2 text-sm bg-surface-elevated text-text-secondary" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Purpose</label>
              <select value={purpose} onChange={(e) => { setPurpose(e.target.value); const p = PURPOSE_OPTIONS.find(o => o.label === e.target.value); if (p) setPurposeCode(p.code); }} className="neo-input w-full rounded-lg px-3 py-2 text-sm">
                {PURPOSE_OPTIONS.map((o) => (
                  <option key={o.code} value={o.label}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Purpose Code</label>
              <input value={purposeCode} onChange={(e) => setPurposeCode(e.target.value)} className="neo-input w-full rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={handlePrint} className="neo-btn px-6 py-2.5 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20">
              <i className="fas fa-print mr-2"></i>Print / Save PDF
            </button>
          </div>
        </div>

        {/* Form preview */}
        <div className="firc-print-root overflow-x-auto">
          <div ref={printRef} className="inline-block">
            {/* Page 1 */}
            <div
              className="firc-page relative bg-white"
              style={{
                width: PAGE_W,
                height: PAGE_H,
                backgroundImage: 'url(/firc_page1.png)',
                backgroundSize: `${PAGE_W}px ${PAGE_H}px`,
                backgroundRepeat: 'no-repeat',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {/* Bill Currency */}
              <span style={{ ...overlayBase, left: 154, top: 242, fontSize: 11, padding: '0 2px' }}>{currencyWord}</span>

              {/* Bill Amount (words) */}
              <span style={{ ...overlayBase, left: 323, top: 257, fontSize: 12, padding: '0 4px', minWidth: 180 }}>{amountWords}</span>

              {/* Bill Amount (figures) */}
              <span style={{ ...overlayBase, left: 154, top: 262, fontSize: 12, padding: '0 4px', minWidth: 80 }}>{amountFigures} {currencyLabel === 'USD' ? '$' : ''}</span>

              {/* Remitter's Name */}
              <span style={{ ...overlayBase, left: 154, top: 314, fontSize: 11, padding: '0 4px', minWidth: 200 }}>{remitterName}</span>

              {/* Remitter's Address */}
              <span style={{ ...overlayBase, left: 154, top: 334, fontSize: 10, padding: '0 4px', minWidth: 240, maxWidth: 280, whiteSpace: 'pre-wrap', lineHeight: 1.3 }}>{remitterAddress}</span>

              {/* Purpose of Remittance */}
              <span style={{ ...overlayBase, left: 154, top: 462, fontSize: 12, padding: '0 4px', minWidth: 140 }}>{purpose}</span>

              {/* Purpose Code */}
              <span style={{ ...overlayBase, left: 414, top: 455, fontSize: 11, padding: '0 4px', minWidth: 60 }}>{purposeCode}</span>
            </div>

            {/* Page 2 */}
            <div
              className="firc-page relative bg-white mt-4"
              style={{
                width: PAGE_W,
                height: PAGE_H,
                backgroundImage: 'url(/firc_page2.png)',
                backgroundSize: `${PAGE_W}px ${PAGE_H}px`,
                backgroundRepeat: 'no-repeat',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {/* Date */}
              <span style={{ ...overlayBase, left: 68, top: 228, fontSize: 11, padding: '0 4px', minWidth: 100 }}>
                {formDate ? new Date(formDate).toLocaleDateString('en-GB') : ''}
              </span>
            </div>

            {/* Page 3 */}
            <div
              className="firc-page relative bg-white mt-4"
              style={{
                width: PAGE_W,
                height: PAGE_H,
                backgroundImage: 'url(/firc_page3.png)',
                backgroundSize: `${PAGE_W}px ${PAGE_H}px`,
                backgroundRepeat: 'no-repeat',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {/* Date */}
              <span style={{ ...overlayBase, left: 68, top: 554, fontSize: 11, padding: '0 4px', minWidth: 100 }}>
                {formDate ? new Date(formDate).toLocaleDateString('en-GB') : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FIRCFormGenerator;
