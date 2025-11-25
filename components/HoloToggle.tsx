import React from 'react';

interface HoloToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const HoloToggle: React.FC<HoloToggleProps> = ({ checked, onChange }) => {
  return (
    <div className="relative w-[250px] flex flex-col items-center perspective-800 z-10 scale-75 sm:scale-90 origin-right">
      <style>{`
        .perspective-800 { perspective: 800px; }
        .transform-style-3d { transform-style: preserve-3d; }
        
        /* Default: Calicut (Blue) */
        .toggle-track {
            background: rgba(22, 35, 29, 0.6);
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            border: 1px solid rgba(62, 92, 118, 0.3);
        }
        
        .toggle-thumb {
            background: radial-gradient(circle, #3e5c76 0%, #1a2c3a 100%);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(62, 92, 118, 0.6);
        }

        /* Checked: Cochin (Green) */
        .toggle-checked .toggle-track {
            background: rgba(22, 35, 29, 0.6);
            border-color: rgba(133, 187, 101, 0.3);
        }

        .toggle-checked .toggle-thumb {
            left: calc(100% - 57px);
            background: radial-gradient(circle, #85bb65 0%, #0c2015 100%);
            border-color: rgba(133, 187, 101, 0.6);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2);
        }
        
        .data-text {
            text-shadow: 0 2px 2px rgba(0,0,0,0.8);
        }
      `}</style>
      <div className={`relative w-full h-[60px] transform-style-3d ${checked ? 'toggle-checked' : ''}`}>
        <input 
          type="checkbox" 
          className="absolute opacity-0 w-0 h-0" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)}
        />
        <div 
            onClick={() => onChange(!checked)}
            className="toggle-track absolute w-full h-full rounded-[30px] cursor-pointer overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          <div className="toggle-thumb absolute w-[54px] h-[54px] left-[3px] top-[3px] rounded-full z-20 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform-style-3d flex items-center justify-center">
             {/* Emblem inside thumb */}
             <div className="w-8 h-8 rounded-full border border-white/10 opacity-50"></div>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
             {/* Calicut Text */}
            <div className={`data-text text-[18px] font-serif font-bold tracking-[2px] uppercase transition-all duration-500 absolute right-[70px] top-1/2 -translate-y-1/2 ${checked ? 'opacity-0' : 'opacity-100 text-[#3e5c76]'}`}>
                Calicut
            </div>
             {/* Cochin Text */}
            <div className={`data-text on text-[18px] font-serif font-bold tracking-[2px] uppercase transition-all duration-500 absolute left-[70px] top-1/2 -translate-y-1/2 ${checked ? 'opacity-100 text-[#85bb65]' : 'opacity-0'}`}>
                Cochin
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoloToggle;