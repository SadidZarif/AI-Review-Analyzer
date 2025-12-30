// ============ DATE RANGE PICKER COMPONENT ============
// Custom date range selection এর জন্য component

import { useState, useEffect } from 'react';
import '../styles/DateRangePicker.css';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangePickerProps {
  onDateRangeChange: (range: DateRange) => void;
  defaultStartDate?: Date;
  defaultEndDate?: Date;
}

function DateRangePicker({ onDateRangeChange, defaultStartDate, defaultEndDate }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(defaultStartDate || null);
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate || null);
  
  // Default dates change হলে state update করছি এবং parent component কে notify করছি
  useEffect(() => {
    if (defaultStartDate && defaultEndDate) {
      setStartDate(defaultStartDate);
      setEndDate(defaultEndDate);
      onDateRangeChange({ startDate: defaultStartDate, endDate: defaultEndDate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStartDate, defaultEndDate]);
  
  // Date format helper - "Jan 1, 2025" format
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };
  
  // Display text - range বা single date
  const getDisplayText = (): string => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (startDate) {
      return formatDate(startDate);
    }
    return 'Select Date Range';
  };
  
  // Date change handler
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setStartDate(date);
    if (date && endDate && date > endDate) {
      // Start date end date এর পরে হলে end date update করছি
      setEndDate(date);
      onDateRangeChange({ startDate: date, endDate: date });
    } else {
      onDateRangeChange({ startDate: date, endDate });
    }
  };
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setEndDate(date);
    if (date && startDate && date < startDate) {
      // End date start date এর আগে হলে start date update করছি
      setStartDate(date);
      onDateRangeChange({ startDate: date, endDate: date });
    } else {
      onDateRangeChange({ startDate, endDate: date });
    }
  };
  
  // Input value format helper (YYYY-MM-DD)
  const formatInputValue = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return (
    <div className="date-range-picker">
      <button 
        className="date-picker-btn"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="material-symbols-outlined">calendar_month</span>
        <span>{getDisplayText()}</span>
        <span className="material-symbols-outlined">arrow_drop_down</span>
      </button>
      
      {isOpen && (
        <div className="date-range-dropdown">
          <div className="date-range-inputs">
            <div className="date-input-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formatInputValue(startDate)}
                onChange={handleStartDateChange}
                max={formatInputValue(endDate || new Date())}
              />
            </div>
            
            <div className="date-input-group">
              <label>End Date</label>
              <input
                type="date"
                value={formatInputValue(endDate)}
                onChange={handleEndDateChange}
                min={formatInputValue(startDate || new Date(2020, 0, 1))}
                max={formatInputValue(new Date())}
              />
            </div>
          </div>
          
          <div className="date-range-actions">
            <button 
              className="clear-btn"
              onClick={() => {
                setStartDate(null);
                setEndDate(null);
                onDateRangeChange({ startDate: null, endDate: null });
              }}
            >
              Clear
            </button>
            <button 
              className="apply-btn"
              onClick={() => setIsOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      )}
      
      {/* Overlay - click করলে dropdown close হবে */}
      {isOpen && (
        <div 
          className="date-range-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default DateRangePicker;

