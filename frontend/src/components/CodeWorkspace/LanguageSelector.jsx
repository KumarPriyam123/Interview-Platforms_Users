import { LANGUAGES } from './utils'

export default function LanguageSelector({ language, onChange, disabled = false }) {
  return (
    <div className="cw-lang-selector">
      <div className={`cw-lang-icon cw-lang-icon--${language === 'cpp' ? 'cpp' : language === 'python' ? 'py' : language === 'java' ? 'java' : 'js'}`}>
        {LANGUAGES.find((l) => l.id === language)?.icon}
      </div>
      <select
        className="cw-lang-select"
        value={language}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
    </div>
  )
}
