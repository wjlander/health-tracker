// Unit conversion utilities

export type WeightUnit = 'lbs' | 'kg' | 'stones';
export type TemperatureUnit = 'fahrenheit' | 'celsius';

export interface UnitPreferences {
  weight_unit: WeightUnit;
  temperature_unit: TemperatureUnit;
}

// Weight conversions (all from pounds as base unit)
export const convertWeight = (value: number, fromUnit: WeightUnit, toUnit: WeightUnit): number => {
  if (fromUnit === toUnit) return value;
  
  // Convert to pounds first
  let pounds: number;
  switch (fromUnit) {
    case 'lbs':
      pounds = value;
      break;
    case 'kg':
      pounds = value * 2.20462;
      break;
    case 'stones':
      pounds = value * 14;
      break;
  }
  
  // Convert from pounds to target unit
  switch (toUnit) {
    case 'lbs':
      return pounds;
    case 'kg':
      return pounds / 2.20462;
    case 'stones':
      return pounds / 14;
  }
};

// Temperature conversions
export const convertTemperature = (value: number, fromUnit: TemperatureUnit, toUnit: TemperatureUnit): number => {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
    return (value - 32) * 5/9;
  } else if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
    return (value * 9/5) + 32;
  }
  
  return value;
};

// Format weight with unit
export const formatWeight = (value: number, unit: WeightUnit): string => {
  const precision = unit === 'stones' ? 1 : unit === 'kg' ? 1 : 1;
  return `${value.toFixed(precision)} ${unit}`;
};

// Format temperature with unit
export const formatTemperature = (value: number, unit: TemperatureUnit): string => {
  return `${value.toFixed(1)}°${unit === 'fahrenheit' ? 'F' : 'C'}`;
};

// Get weight unit display name
export const getWeightUnitDisplay = (unit: WeightUnit): string => {
  switch (unit) {
    case 'lbs':
      return 'Pounds (lbs)';
    case 'kg':
      return 'Kilograms (kg)';
    case 'stones':
      return 'Stones (st)';
  }
};

// Get temperature unit display name
export const getTemperatureUnitDisplay = (unit: TemperatureUnit): string => {
  switch (unit) {
    case 'fahrenheit':
      return 'Fahrenheit (°F)';
    case 'celsius':
      return 'Celsius (°C)';
  }
};

// Default unit preferences
export const defaultUnitPreferences: UnitPreferences = {
  weight_unit: 'lbs',
  temperature_unit: 'fahrenheit'
};