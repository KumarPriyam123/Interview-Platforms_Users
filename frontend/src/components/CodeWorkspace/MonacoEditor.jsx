import Editor from '@monaco-editor/react'

const DEFAULT_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbersMinChars: 3,
  scrollBeyondLastLine: false,
  padding: { top: 14 },
}

export default function MonacoEditor({
  language = 'javascript',
  value = '',
  onChange,
  readOnly = false,
  height = '100%',
  options,
}) {
  return (
    <Editor
      height={height}
      language={language === 'cpp' ? 'cpp' : language}
      theme="vs-dark"
      value={value}
      onChange={(val) => onChange(val || '')}
      options={{
        ...DEFAULT_OPTIONS,
        readOnly,
        ...options,
      }}
    />
  )
}
