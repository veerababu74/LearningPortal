import { CodeHighlight } from './CodeHighlight'

export function PythonHighlight({ code }: { code: string }) {
  return <CodeHighlight code={code} language="python" />
}
