import { FunctionalComponent } from "preact";

interface CountrySelectorProps {
  selectedCountry: string;
  onChange: (e: Event) => void;
  // TODO: Add countries prop later
}

// TODO: Fetch or define a list of countries supported by Nager.Date
const placeholderCountries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
];

const CountrySelector: FunctionalComponent<CountrySelectorProps> = (
  { selectedCountry, onChange },
) => {
  return (
    <div>
      <label htmlFor="country-select">Country:</label>
      <select id="country-select" value={selectedCountry} onChange={onChange}>
        {placeholderCountries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CountrySelector;
